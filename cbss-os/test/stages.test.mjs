import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lifecycleForStage, normalizeStage, stageMatches, STAGES } from "../src/stages.ts";
import { applyBookStage, ingestInbound, logTouch, publicCycle, runCteWork } from "../src/cycle/engine.ts";
import { emptyRecord, writeRecord } from "../src/cycle/store.ts";
import { handleCycleAuthed } from "../src/cycle/http.ts";
import { pageHtml } from "../src/page.ts";

const james = { email: "james@cbshippingsolutions.com", name: "James", title: "Business Developer", lastLogin: "2026-09-13T00:00:00Z" };

function envUsers(users, bag = {}) {
  const store = new Map();
  store.set("cycle:users", users);
  return {
    AGENTMAIL_API_KEY: "am_test",
    SESSIONS: {
      async get(key, type) {
        const val = store.get(key);
        if (val == null) return null;
        return type === "json" ? val : JSON.stringify(val);
      },
      async put(key, value) {
        store.set(key, typeof value === "string" ? JSON.parse(value) : value);
      },
    },
    bag: store,
  };
}

describe("one stage language", () => {
  it("maps old Kanban names onto one list", () => {
    assert.equal(normalizeStage("New Lead"), "New");
    assert.equal(normalizeStage("Contacted"), "Working");
    assert.equal(normalizeStage("CTE in progress"), "Working");
    assert.equal(normalizeStage("Follow up in progress"), "Follow-up");
    assert.equal(normalizeStage("Quote"), "Quoted");
    assert.equal(normalizeStage("Flex Buy"), "Quoted");
    assert.equal(normalizeStage("Won"), "Paid");
    assert.equal(lifecycleForStage("Proposal Sent"), "Quoted");
    assert.equal(lifecycleForStage("DNC"), "Lost");
    assert.equal(stageMatches("New Lead", "New"), true);
    assert.ok(STAGES.includes("Not interested"));
    assert.ok(STAGES.includes("Bought elsewhere"));
  });

  it("puts that same list on the contact card and pipeline", () => {
    const page = pageHtml();
    for (const stage of STAGES) assert.match(page, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(page, /id="work-cte"/);
    assert.match(page, /data-cte="/);
    assert.match(page, /Didn't answer/);
    assert.match(page, /\/cycle\/work/);
    assert.match(page, /crm-monday-tab/);
    assert.match(page, /No AgentMail on this card yet/);
    assert.doesNotMatch(page, /id="cycle-life"/);
  });
});

describe("call and text log", () => {
  it("timestamps a call outcome without sending CTE mail", async () => {
    const env = envUsers([james]);
    const hint = { id: "touch-1", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await logTouch(env, hint, { channel: "call", outcome: "Connected" }, "James");
    assert.equal(result.error, undefined);
    assert.match(result.rec.events[0].text, /Call · Connected/);
    assert.equal(result.rec.sends.cte1, undefined);
    const bad = await logTouch(env, hint, { channel: "call", outcome: "Maybe later" }, "James");
    assert.equal(bad.error, "Pick how the call went.");
  });

  it("stops the ladder when a text says they replied", async () => {
    const env = envUsers([james]);
    const hint = { id: "touch-2", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await logTouch(env, hint, { channel: "text", outcome: "They replied" }, "James");
    assert.equal(result.rec.stopped, true);
    assert.ok(result.rec.events.some((e) => /Text · They replied/.test(e.text) || /Ladder stopped/.test(e.text)));
  });
});

describe("AgentMail on the card", () => {
  it("keeps inbound subject and preview after the ladder is already stopped", async () => {
    const env = envUsers([james]);
    const rec = emptyRecord("mail-1");
    rec.clientEmail = "pat@test.com";
    rec.threadIds = ["thr-1"];
    rec.stopped = true;
    rec.stoppedReason = "Rep clicked Replied";
    rec.mail = [];
    await writeRecord(env, rec);
    const n = await ingestInbound(env, {
      threadId: "thr-1",
      messageId: "msg-9",
      from: "pat@test.com",
      subject: "Still need a 40HC",
      text: "Yes still need it. Do not invent a price.",
    });
    assert.equal(n, 1);
    const again = await env.SESSIONS.get("cycle:rec:mail-1", "json");
    assert.equal(again.mail[0].direction, "in");
    assert.equal(again.mail[0].subject, "Still need a 40HC");
    assert.match(again.mail[0].preview, /Yes still need it/);
    const pub = publicCycle(again);
    assert.equal(pub.mail[0].subject, "Still need a 40HC");
  });
});

describe("CTE work wizard", () => {
  it("CTE1 didn't answer sends the intro and books the ladder", async () => {
    const env = envUsers([james]);
    const hint = { id: "work-1", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    let sent = "";
    const result = await runCteWork(env, hint, { step: "cte1", outcome: "no_answer" }, "James", async (_url, init) => {
      sent = String(init && init.body || "");
      return new Response(JSON.stringify({ message_id: "m-cte1", thread_id: "t-cte1" }), { status: 200 });
    });
    assert.equal(result.error, undefined);
    assert.equal(result.rec.sends.cte1.status, "sent");
    assert.equal(result.rec.sends.cte2.status, "pending");
    assert.match(sent, /wanted to introduce myself/);
  });

  it("CTE2 didn't answer sends CTE2 only", async () => {
    const env = envUsers([james]);
    const hint = { id: "work-2", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    let sent = "";
    const result = await runCteWork(env, hint, { step: "cte2", outcome: "no_answer" }, "James", async (_url, init) => {
      sent = String(init && init.body || "");
      return new Response(JSON.stringify({ message_id: "m-cte2", thread_id: "t-cte2" }), { status: 200 });
    });
    assert.match(sent, /making sure my last note did not get buried/);
    assert.equal(result.rec.sends.cte2.status, "sent");
  });

  it("Did answer logs and does not send AgentMail", async () => {
    const env = envUsers([james]);
    const hint = { id: "work-3", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await runCteWork(env, hint, { step: "cte1", outcome: "answered" }, "James", async () => {
      throw new Error("should not send");
    });
    assert.match(result.rec.events[0].text, /Did answer/);
    assert.equal(result.rec.sends.cte1, undefined);
  });

  it("Not interested holds them on the email campaign path", async () => {
    const env = envUsers([james]);
    const hint = { id: "work-4", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await runCteWork(env, hint, { step: "cte1", outcome: "not_interested" }, "James");
    assert.equal(result.bookStatus, "Not interested");
    assert.equal(result.campaign, "hold");
    assert.equal(result.rec.stopped, true);
  });

  it("Bought elsewhere holds them and Bad number starts the reach-out campaign", async () => {
    const env = envUsers([james]);
    const bought = await runCteWork(env, { id: "work-5", name: "Pat Lee", email: "pat@test.com", owner: "James" }, { step: "cte2", outcome: "bought_elsewhere" }, "James");
    assert.equal(bought.bookStatus, "Bought elsewhere");
    assert.equal(bought.campaign, "hold");
    let sent = "";
    const bad = await runCteWork(env, { id: "work-6", name: "Pat Lee", email: "pat@test.com", owner: "James" }, { step: "cte3", outcome: "bad_number" }, "James", async (_url, init) => {
      sent = String(init && init.body || "");
      return new Response(JSON.stringify({ message_id: "m-bad", thread_id: "t-bad" }), { status: 200 });
    });
    assert.equal(bad.bookStatus, "Email campaign");
    assert.equal(bad.campaign, "bad_number");
    assert.match(sent, /cannot reach you/);
  });

  it("POST /cycle/work enrolls the hold list from Not interested", async () => {
    const env = envUsers([james]);
    const user = { email: james.email, name: james.name };
    const res = await handleCycleAuthed("/cycle/work", "POST", env, user, {
      id: "work-http",
      name: "Pat Lee",
      email: "pat@test.com",
      owner: "James",
      phone: "8705550199",
      city: "Corning",
      step: "cte1",
      outcome: "not_interested",
    }, new URLSearchParams());
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.bookStatus, "Not interested");
    assert.equal(res.body.items[0].id, "work-http");
    assert.equal(res.body.items[0].reason, "hold");
  });
});

describe("book stage writes one language", () => {
  it("parks DNC without sending a lost email", async () => {
    const env = envUsers([james]);
    const hint = { id: "dnc-1", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await applyBookStage(env, hint, "DNC", "James", async () => {
      throw new Error("should not send");
    });
    assert.equal(result.bookStatus, "DNC");
    assert.equal(result.rec.stopped, true);
    assert.equal(result.rec.stoppedReason, "DNC");
  });

  it("accepts /cycle/stage and /cycle/touch", async () => {
    const env = envUsers([james]);
    const user = { email: james.email, name: james.name };
    const stage = await handleCycleAuthed("/cycle/stage", "POST", env, user, {
      id: "http-1",
      name: "Pat Lee",
      email: "pat@test.com",
      owner: "James",
      stage: "Follow-up",
    }, new URLSearchParams());
    assert.equal(stage.status, 200);
    assert.equal(stage.body.bookStatus, "Follow-up");
    const touch = await handleCycleAuthed("/cycle/touch", "POST", env, user, {
      id: "http-1",
      channel: "call",
      outcome: "Voicemail",
    }, new URLSearchParams());
    assert.equal(touch.body.ok, true);
    assert.match(touch.body.cycle.events[0].text, /Call · Voicemail/);
  });
});
