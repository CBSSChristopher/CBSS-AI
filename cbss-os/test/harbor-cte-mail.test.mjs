import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DEFAULT_INBOX, ownerTrackingCc } from "../src/cycle/agentmail.ts";
import { fireTemplate, markContactPaid, runDueSends } from "../src/cycle/engine.ts";
import { emptyRecord, writeRecord } from "../src/cycle/store.ts";
import { HARBOR_REPLY_TO, officeCopy, resolveAssignedRep, rosterCompanyEmail, rosterPhone } from "../src/cycle/rep.ts";
import { planHarborReadyToBuyNotify } from "../src/va/harbor-quote.ts";
import { dispatchHarborCteMail, harborCteTemplateFor } from "../src/va/harbor-mail.ts";
import { isHarborDueFollowUp, pickHarborQueue } from "../src/va/workflow.ts";
import { CHRISTOPHER_PERSONAL_CELL } from "../src/va/scripts.ts";

const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

function memoryKv(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const value = data.get(key);
      if (value == null) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      data.set(key, String(value));
    },
    async delete(key) {
      data.delete(key);
    },
  };
}

function envUsers(extra = {}) {
  return {
    SESSIONS: memoryKv(),
    AGENTMAIL_API_KEY: "am_test",
    AGENTMAIL_INBOX: DEFAULT_INBOX,
    ...extra,
  };
}

function pdfAssets() {
  const bytes = new TextEncoder().encode("%PDF-1.4 test-fixture\n%%EOF\n");
  return {
    ASSETS: {
      async fetch() {
        return new Response(bytes, { status: 200, headers: { "Content-Type": "application/pdf" } });
      },
    },
  };
}

const customer = "pat.lee@example.com";
const card = {
  id: "lead-harbor-1",
  name: "Pat Lee",
  email: customer,
  phone: "8705550199",
  owner: "Harbor",
  status: "Working",
  cteStage: "CTE1",
};

function okFetch(bucket) {
  return async (url, init) => {
    bucket.push({ url: String(url), body: JSON.parse(String(init && init.body || "{}")) });
    return new Response(JSON.stringify({ message_id: "m-" + bucket.length, thread_id: "t-harbor" }), { status: 200 });
  };
}

describe("Harbor is a CTE assigned rep", () => {
  it("resolves Harbor with a company Reply-To and does not pause CTE for a missing Yard login", () => {
    const hit = resolveAssignedRep("Harbor", []);
    assert.equal(hit.ok, true);
    assert.equal(hit.source, "active");
    assert.equal(hit.user.email, HARBOR_REPLY_TO);
    assert.equal(rosterCompanyEmail("Harbor"), HARBOR_REPLY_TO);
    assert.equal(HARBOR_REPLY_TO, "harbor@cbshippingsolutions.com");
    assert.doesNotMatch(HARBOR_REPLY_TO, /gmail\.com|323-2593/);
    assert.equal(rosterPhone("Harbor").includes("380-4010"), true);
    assert.equal(rosterPhone("Harbor").includes(CHRISTOPHER_PERSONAL_CELL), false);
    const james = resolveAssignedRep("James", []);
    assert.equal(james.ok, false);
    assert.match(james.reason, /no active Yard login/);
  });
});

describe("Harbor CTE outcomes use fireTemplate", () => {
  it("logs no-answer and voicemail as a live CTE1 AgentMail send", async () => {
    for (const outcome of ["no-answer", "voicemail"]) {
      const calls = [];
      const env = envUsers();
      const mailed = await dispatchHarborCteMail(env, { ...card, id: "lead-" + outcome }, outcome, okFetch(calls));
      assert.equal(mailed.required, true);
      assert.equal(mailed.ok, true);
      assert.equal(mailed.dialing, false);
      assert.equal(mailed.sms, false);
      assert.equal(mailed.step, "cte1");
      assert.equal(mailed.to, customer);
      assert.equal(mailed.from, DEFAULT_INBOX);
      assert.equal(mailed.replyTo, HARBOR_REPLY_TO);
      assert.equal(mailed.messageId, "m-1");
      assert.equal(calls.length, 1);
      assert.match(calls[0].url, /inboxes\/cbss%40agentmail\.to\/messages\/send/);
      assert.deepEqual(calls[0].body.to, [customer]);
      assert.deepEqual(calls[0].body.reply_to, [HARBOR_REPLY_TO]);
      assert.deepEqual(calls[0].body.cc, [ownerTrackingCc()]);
      assert.equal(calls[0].body.cc.includes("aliyah@cbshippingsolutions.com"), false);
      assert.match(calls[0].body.text, /This is Harbor with CB Shipping Solutions/);
      assert.match(calls[0].body.text, /harbor@cbshippingsolutions\.com/);
      assert.match(calls[0].body.text, /870\) 380-4010/);
      assert.doesNotMatch(calls[0].body.text, /323-2593/);
      assert.doesNotMatch(JSON.stringify(calls[0].body), /gmail\.com/);
      const rec = await env.SESSIONS.get("cycle:rec:lead-" + outcome, "json");
      assert.equal(rec.owner, "Harbor");
      assert.equal(rec.ownerEmail, HARBOR_REPLY_TO);
      assert.equal(rec.paused, false);
      assert.equal(rec.sends.cte1.status, "sent");
      assert.equal(rec.sends.cte2.status, "pending");
    }
  });

  it("sends CTE1 on soft-delay and CTE2 when that step is logged", async () => {
    const softCalls = [];
    const soft = await dispatchHarborCteMail(envUsers(), card, "soft-delay", okFetch(softCalls));
    assert.equal(soft.step, "cte1");
    assert.equal(soft.ok, true);
    assert.equal(soft.dialing, false);
    assert.equal(soft.sms, false);
    assert.deepEqual(softCalls[0].body.reply_to, [HARBOR_REPLY_TO]);
    assert.deepEqual(softCalls[0].body.to, [customer]);

    const later = [];
    const cte2 = await dispatchHarborCteMail(
      envUsers(),
      { ...card, id: "lead-cte2", cteStage: "CTE2" },
      "voicemail",
      okFetch(later),
    );
    assert.equal(harborCteTemplateFor({ cteStage: "CTE2" }, "voicemail"), "cte2");
    assert.equal(cte2.step, "cte2");
    assert.equal(cte2.ok, true);
    assert.match(later[0].body.subject, /checking in/);
    assert.deepEqual(later[0].body.reply_to, [HARBOR_REPLY_TO]);
    assert.equal(cte2.dialing, false);
    assert.equal(cte2.sms, false);
  });

  it("sends a due Harbor CTE2 through the same cron fireTemplate path", async () => {
    const calls = [];
    const env = envUsers();
    const first = await dispatchHarborCteMail(env, card, "no-answer", okFetch(calls));
    assert.equal(first.ok, true);
    const rec = await env.SESSIONS.get("cycle:rec:lead-harbor-1", "json");
    rec.sends.cte2 = { ...rec.sends.cte2, status: "pending", dueAt: "2026-09-01T10:00" };
    rec.sends.cte3 = { ...rec.sends.cte3, status: "pending", dueAt: "2099-01-01T10:00" };
    rec.sends.cte4 = { ...rec.sends.cte4, status: "pending", dueAt: "2099-01-02T10:00" };
    await env.SESSIONS.put("cycle:rec:lead-harbor-1", JSON.stringify(rec));
    const due = await runDueSends(env, new Date("2026-09-22T15:00:00Z"), okFetch(calls));
    assert.equal(due.sent, 1);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].body.to, [customer]);
    assert.deepEqual(calls[1].body.reply_to, [HARBOR_REPLY_TO]);
    assert.match(calls[1].body.text, /Harbor again with CB Shipping Solutions/);
    const after = await env.SESSIONS.get("cycle:rec:lead-harbor-1", "json");
    assert.equal(after.sends.cte2.status, "sent");
    assert.equal(after.paused, false);
  });

  it("does not send CTE mail for answered, and fails closed without AgentMail or a client email", async () => {
    let fetches = 0;
    const fetchSpy = async () => {
      fetches += 1;
      return new Response(JSON.stringify({ message_id: "nope" }), { status: 200 });
    };
    const answered = await dispatchHarborCteMail(envUsers(), card, "answered", fetchSpy);
    assert.equal(answered.required, false);
    assert.equal(answered.dialing, false);
    assert.equal(answered.sms, false);
    assert.equal(fetches, 0);

    const unconfigured = await dispatchHarborCteMail(
      envUsers({ AGENTMAIL_API_KEY: "" }),
      card,
      "no-answer",
      fetchSpy,
    );
    assert.equal(unconfigured.required, true);
    assert.equal(unconfigured.ok, false);
    assert.match(unconfigured.error, /AGENTMAIL_API_KEY/);
    assert.equal(fetches, 0);

    const noEmail = await dispatchHarborCteMail(
      envUsers(),
      { ...card, id: "no-email", email: "" },
      "voicemail",
      fetchSpy,
    );
    assert.equal(noEmail.ok, false);
    assert.match(noEmail.error, /No client email/);
    assert.equal(fetches, 0);
  });

  it("wires the Harbor outcome routes to dispatchHarborCteMail", () => {
    assert.match(index, /dispatchHarborCteMail/);
    assert.match(index, /finishHarborOutcome/);
    assert.match(index, /\/va\/harbor\/log-outcome/);
  });
});

describe("paid, ready-to-buy, and Harbor queue scope stay put", () => {
  it("keeps Paid Next Steps office CC and does not use Christopher's personal mailbox as Reply-To", async () => {
    const office = officeCopy();
    assert.equal(office[0], ownerTrackingCc());
    assert.equal(office.length, 2);
    assert.match(office[1], /^aliyah@/);
    const calls = [];
    const env = envUsers(pdfAssets());
    const result = await markContactPaid(
      env,
      { id: "paid-harbor", name: "Pat Lee", email: customer, owner: "Harbor" },
      "Harbor",
      okFetch(calls),
    );
    assert.equal(result.send.ok, true);
    assert.deepEqual(calls[0].body.to, [customer]);
    assert.ok(calls[0].body.cc.includes(office[0]));
    assert.ok(calls[0].body.cc.includes(office[1]));
    assert.ok(calls[0].body.cc.includes(HARBOR_REPLY_TO));
    assert.deepEqual(calls[0].body.reply_to, [HARBOR_REPLY_TO]);
    assert.doesNotMatch(JSON.stringify(calls[0].body), /gmail\.com|323-2593/);
  });

  it("still notifies only Christopher Banks and Bryan Reese on ready-to-buy", async () => {
    const notify = planHarborReadyToBuyNotify("Bryan Reese");
    assert.deepEqual(notify.to, [
      rosterCompanyEmail("Christopher Banks"),
      rosterCompanyEmail("Bryan Reese"),
    ]);
    assert.equal(notify.to.includes(HARBOR_REPLY_TO), false);
    assert.equal(notify.closer, "Bryan Reese");
    let fetches = 0;
    const mailed = await dispatchHarborCteMail(envUsers(), card, "ready-to-buy", async () => {
      fetches += 1;
      return new Response("{}", { status: 200 });
    });
    assert.equal(mailed.required, false);
    assert.equal(fetches, 0);
  });

  it("still rejects James and other reps on the Harbor due follow-up queue", () => {
    const now = new Date("2026-09-22T17:00:00Z");
    const james = {
      id: "james-due",
      name: "James Card",
      phone: "8705550101",
      owner: "James",
      status: "Follow-up",
      cteStage: "CTE2",
      followUpDate: "2026-09-22T10:00",
    };
    const bryan = { ...james, id: "bryan-due", owner: "Bryan Reese" };
    const pile = {
      id: "pile",
      name: "Pool Card",
      phone: "8705550102",
      owner: "New/Unassigned",
      status: "New",
    };
    assert.equal(isHarborDueFollowUp(james, now), false);
    assert.equal(isHarborDueFollowUp(bryan, now), false);
    const hit = pickHarborQueue([james, bryan, pile], { now });
    assert.equal(hit && hit.contact.id, "pile");
    assert.equal(hit && hit.source, "new-unassigned");
  });

  it("still pauses a human rep with no Yard login before sendAgentMail", async () => {
    let fetches = 0;
    const env = envUsers();
    const rec = {
      ...emptyRecord("human-pause"),
      clientEmail: customer,
      clientName: "Pat Lee",
      owner: "James",
    };
    await writeRecord(env, rec);
    const send = await fireTemplate(env, rec, "cte1", "James", async () => {
      fetches += 1;
      return new Response(JSON.stringify({ message_id: "nope" }), { status: 200 });
    });
    assert.equal(send.ok, false);
    assert.match(send.error, /no active Yard login/);
    assert.equal(fetches, 0);
  });
});
