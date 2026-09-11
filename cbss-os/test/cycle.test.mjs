import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  addBusinessDays,
  civilKey,
  extraHolidays,
  isBusinessDay,
  usFederalHolidays,
} from "../src/cycle/business-days.ts";
import { applyOverride, applyNoAnswerSchedule, dueTemplates, scheduleFromCte1 } from "../src/cycle/ladder.ts";
import { emptyRecord } from "../src/cycle/store.ts";
import { resolveAssignedRep, rosterCompanyEmail } from "../src/cycle/rep.ts";
import { normalizeLifecycle, legacyStatusFor } from "../src/cycle/lifecycle.ts";
import { fireTemplate, logAttempt, markContactPaid, reassignOwner, runDueSends, stopForReply } from "../src/cycle/engine.ts";
import { paidBody } from "../src/cycle/templates.ts";
import {
  ownerTrackingCc,
  sendAgentMail,
  withOwnerTrackingCc,
} from "../src/cycle/agentmail.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const http = readFileSync(new URL("../src/cycle/http.ts", import.meta.url), "utf8");
const engineSrc = readFileSync(new URL("../src/cycle/engine.ts", import.meta.url), "utf8");

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

function envUsers(users, extra = {}) {
  return {
    SESSIONS: memoryKv({ "cycle:users": JSON.stringify(users) }),
    AGENTMAIL_API_KEY: "am_test",
    ...extra,
  };
}

function pdfAssets(bytes = new TextEncoder().encode("%PDF-1.4 test-fixture\n%%EOF\n")) {
  return {
    ASSETS: {
      async fetch() {
        return new Response(bytes, { status: 200, headers: { "Content-Type": "application/pdf" } });
      },
    },
  };
}

const james = { email: "james@cbshippingsolutions.com", name: "James", title: "James", lastLogin: "2026-09-09T12:00:00Z" };
const kyle = { email: "kyle@cbshippingsolutions.com", name: "Kyle Hodgkiss", title: "Kyle Hodgkiss", lastLogin: "2026-09-09T12:00:00Z" };

describe("business-day math", () => {
  it("skips weekends and computes federal holidays for more than 2026", () => {
    const mon = { y: 2026, m: 9, d: 14 };
    assert.equal(isBusinessDay(mon), true);
    assert.equal(civilKey(addBusinessDays(mon, 1)), "2026-09-15");
    assert.equal(civilKey(addBusinessDays({ y: 2026, m: 9, d: 11 }, 1)), "2026-09-14");
    const thanks2026 = usFederalHolidays(2026).find((d) => d.m === 11 && d.d === 26);
    const thanks2027 = usFederalHolidays(2027).find((d) => d.m === 11 && d.d === 25);
    assert.ok(thanks2026);
    assert.ok(thanks2027);
    const july4sat = usFederalHolidays(2026).find((d) => d.m === 7 && d.d === 3);
    assert.ok(july4sat, "Independence Day 2026 is Saturday, observed Friday the 3rd");
  });

  it("schedules CTE2/3/4 from CTE1 as +1 / +3 / +5 business days", () => {
    const dates = scheduleFromCte1({ y: 2026, m: 9, d: 14 });
    assert.equal(dates.cte2, "2026-09-15T10:00");
    assert.equal(dates.cte3, "2026-09-17T10:00");
    assert.equal(dates.cte4, "2026-09-21T10:00");
  });

  it("honors US_HOLIDAY_EXTRA in any year", () => {
    const extra = extraHolidays("2026-09-15,2027-09-16");
    assert.equal(civilKey(addBusinessDays({ y: 2026, m: 9, d: 14 }, 1, extra)), "2026-09-16");
    assert.equal(civilKey(addBusinessDays({ y: 2027, m: 9, d: 15 }, 1, extra)), "2027-09-17");
  });
});

describe("lifecycle compatibility", () => {
  it("maps old CRM stages onto the new lifecycle without dropping Lost", () => {
    assert.equal(normalizeLifecycle("New Lead"), "New");
    assert.equal(normalizeLifecycle("CTE in progress"), "Working");
    assert.equal(normalizeLifecycle("Quoted"), "Quoted");
    assert.equal(normalizeLifecycle("Won"), "Paid");
    assert.equal(legacyStatusFor("Working"), "CTE in progress");
    assert.equal(legacyStatusFor("Not interested"), "Lost");
  });
});

describe("assigned rep resolution", () => {
  it("never guesses an email for an unknown owner", () => {
    const miss = resolveAssignedRep("Pat Nobody", [james]);
    assert.equal(miss.ok, false);
    const hit = resolveAssignedRep("James", [james, kyle]);
    assert.equal(hit.ok, true);
    assert.equal(hit.source, "active");
    assert.equal(hit.user.email, "james@cbshippingsolutions.com");
    const unassigned = resolveAssignedRep("New/Unassigned", [james]);
    assert.equal(unassigned.ok, false);
    assert.equal(rosterCompanyEmail("Pat Nobody"), "");
  });

  it("resolves known roster emails when the Yard login list is empty", () => {
    const jamesRoster = resolveAssignedRep("James", [], { allowRoster: true });
    assert.equal(jamesRoster.ok, true);
    assert.equal(jamesRoster.source, "roster");
    assert.equal(jamesRoster.user.email, "james@cbshippingsolutions.com");
    const kyleRoster = resolveAssignedRep("Kyle Hodgkiss", [], { allowRoster: true });
    assert.equal(kyleRoster.ok, true);
    assert.equal(kyleRoster.user.email, "kyle@cbshippingsolutions.com");
    const cteStillPaused = resolveAssignedRep("James", []);
    assert.equal(cteStillPaused.ok, false);
    assert.match(cteStillPaused.reason, /no active Yard login/);
    assert.equal(rosterCompanyEmail("James Rodda"), "james@cbshippingsolutions.com");
  });
});

describe("CTE override, stop, reassignment, cron idempotency", () => {
  it("recalculates later CTE dates from the override point", () => {
    const rec = applyNoAnswerSchedule(emptyRecord("1"));
    rec.cte1Date = "2026-09-14";
    applyNoAnswerSchedule(rec);
    const result = applyOverride(rec, "2026-09-16T09:00");
    assert.equal(result.ok, true);
    assert.equal(rec.sends.cte2.dueAt, "2026-09-16T09:00");
    assert.equal(rec.sends.cte3.dueAt, "2026-09-18T10:00");
    assert.equal(rec.sends.cte4.dueAt, "2026-09-22T10:00");
  });

  it("reply-stop wins over override and cancels remaining sends", async () => {
    const env = envUsers([james]);
    const hint = { id: "c1", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    await logAttempt(env, hint, "no_answer", "James", async () => {
      return new Response(JSON.stringify({ message_id: "m1", thread_id: "t1" }), { status: 200 });
    });
    const stopped = await stopForReply(env, hint, "James", "rep");
    assert.equal(stopped.stopped, true);
    assert.match(stopped.events[0].text, /Client replied · Ladder stopped/);
    const over = await applyOverride(stopped, "2026-09-20T10:00");
    assert.equal(over.ok, false);
    assert.equal(dueTemplates(stopped, new Date("2026-12-01T15:00:00Z")).length, 0);
  });

  it("reassignment mid-ladder keeps history and points future alerts at the new rep", async () => {
    const env = envUsers([james, kyle]);
    const hint = { id: "c2", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    await logAttempt(env, hint, "logged", "James");
    const rec = await reassignOwner(env, { ...hint, owner: "Kyle Hodgkiss" }, "Christopher Banks");
    assert.equal(rec.ownerEmail, "kyle@cbshippingsolutions.com");
    assert.ok(rec.events.some((e) => /Prior owner is not notified/.test(e.text)));
  });

  it("duplicate cron does not send twice", async () => {
    let sends = 0;
    const env = envUsers([james]);
    const hint = { id: "c3", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    const { rec } = await logAttempt(env, hint, "no_answer", "James", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "m" + sends, thread_id: "t1" }), { status: 200 });
    });
    assert.equal(sends, 1);
    await fireTemplate(env, rec, "cte1", "cron", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "m-dup" }), { status: 200 });
    });
    assert.equal(sends, 1);
    assert.equal(rec.sends.cte1.status, "sent");
  });

  it("paid send is once-only and AgentMail failure keeps the paid lifecycle", async () => {
    const env = envUsers([james]);
    const hint = { id: "c4", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    const fail = await markContactPaid(env, hint, "James", async () => new Response("nope", { status: 500 }));
    assert.equal(fail.rec.lifecycle, "Paid");
    assert.equal(fail.rec.sends.paid.status, "failed");
    let sends = 0;
    const ok = await markContactPaid(env, hint, "James", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "paid1", thread_id: "tp" }), { status: 200 });
    });
    assert.equal(ok.send.ok, true);
    const again = await markContactPaid(env, hint, "James", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "paid2" }), { status: 200 });
    });
    assert.equal(again.send.duplicate, true);
    assert.equal(sends, 1);
    assert.doesNotMatch(paidBody("Gary"), /\$|\bACH\b|routing/i);
  });

  it("attaches Next Steps as base64 content on Lifecycle Paid and ignores NEXT_STEPS_PDF_URL", async () => {
    const calls = [];
    const env = envUsers([james], { NEXT_STEPS_PDF_URL: "https://example.invalid/do-not-fetch.pdf", ...pdfAssets() });
    const hint = { id: "c-brent-pdf", name: "Brent Snyder", email: "brent@test.com", owner: "James" };
    const result = await markContactPaid(env, hint, "Christopher Banks", async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ message_id: "paid-pdf", thread_id: "tp-pdf" }), { status: 200 });
    });
    assert.equal(result.send.ok, true);
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0].url, /example\.invalid/);
    const payload = JSON.parse(calls[0].init.body);
    const att = payload.attachments[0];
    assert.equal(att.filename, "CBSS-Next-Steps-After-Your-Order.pdf");
    assert.equal(att.content_type, "application/pdf");
    assert.equal(att.content_disposition, "attachment");
    assert.ok(att.content);
    assert.equal(att.url, undefined);
    assert.equal(Buffer.from(att.content, "base64").subarray(0, 5).toString(), "%PDF-");
    assert.doesNotMatch(JSON.stringify(payload.attachments), /"url"/);
  });

  it("sends paid Next Steps when owner is James and the users list is empty", async () => {
    const calls = [];
    const env = envUsers([], pdfAssets());
    const hint = { id: "c-james-empty", name: "Brent Snyder", email: "brent@test.com", owner: "James" };
    const result = await markContactPaid(env, hint, "Christopher Banks", async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ message_id: "paid-roster", thread_id: "tp-roster" }), { status: 200 });
    });
    assert.equal(result.send.ok, true);
    assert.equal(result.rec.lifecycle, "Paid");
    assert.equal(result.rec.sends.paid.status, "sent");
    assert.equal(result.rec.ownerEmail, "james@cbshippingsolutions.com");
    assert.equal(calls.length, 1);
    const payload = JSON.parse(calls[0].init.body);
    assert.deepEqual(payload.to, ["brent@test.com"]);
    assert.ok(payload.cc.some((addr) => addr.startsWith("christopher@")));
    assert.ok(payload.cc.some((addr) => addr.startsWith("aliyah@")));
    assert.ok(payload.cc.includes("james@cbshippingsolutions.com"));
    assert.deepEqual(payload.reply_to, ["james@cbshippingsolutions.com"]);
    assert.ok(result.rec.events.some((e) => /roster email/.test(e.text)));
    assert.ok(Array.isArray(payload.attachments));
    assert.equal(payload.attachments[0].filename, "CBSS-Next-Steps-After-Your-Order.pdf");
    assert.equal(payload.attachments[0].content_type, "application/pdf");
    assert.equal(payload.attachments[0].content_disposition, "attachment");
    assert.equal(typeof payload.attachments[0].content, "string");
    assert.match(payload.attachments[0].content, /^JVBER/);
    assert.equal("url" in payload.attachments[0], false);
    const again = await markContactPaid(env, hint, "Christopher Banks", async () => {
      calls.push({ url: "nope" });
      return new Response(JSON.stringify({ message_id: "paid-dup" }), { status: 200 });
    });
    assert.equal(again.send.duplicate, true);
    assert.equal(calls.length, 1);
  });

  it("fails paid cleanly when the client email is missing", async () => {
    let sends = 0;
    const env = envUsers([]);
    const hint = { id: "c-no-email", name: "Brent Snyder", email: "", owner: "James" };
    const result = await markContactPaid(env, hint, "Christopher Banks", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "should-not" }), { status: 200 });
    });
    assert.equal(result.send.ok, false);
    assert.match(result.send.error, /No client email/);
    assert.equal(result.rec.lifecycle, "Paid");
    assert.equal(result.rec.sends.paid.status, "failed");
    assert.equal(sends, 0);
    assert.ok(result.rec.events.some((e) => /No client email/.test(e.text)));
  });

  it("still pauses CTE mail when the assigned rep is not an active Yard login", async () => {
    let sends = 0;
    const env = envUsers([]);
    const hint = { id: "c-cte-pause", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    const { rec, send } = await logAttempt(env, hint, "no_answer", "James", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "cte-should-not" }), { status: 200 });
    });
    assert.equal(sends, 0);
    assert.equal(send.ok, false);
    assert.equal(rec.paused, true);
    assert.match(rec.pauseReason, /no active Yard login/);
    const again = await fireTemplate(env, rec, "cte1", "cron", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "cte-still-no" }), { status: 200 });
    });
    assert.equal(again.ok, false);
    assert.equal(sends, 0);
  });

  it("skips a second paid email when the invoice Worker already sent it", async () => {
    let sends = 0;
    const env = envUsers([james]);
    const hint = { id: "c5", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    const result = await markContactPaid(env, hint, "James", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "nope" }), { status: 200 });
    }, { skipEmail: true });
    assert.equal(result.send.skipped, true);
    assert.equal(result.rec.lifecycle, "Paid");
    assert.equal(sends, 0);
  });

  it("does not send CTE mail outside Chicago business hours", async () => {
    const env = envUsers([james]);
    const hint = { id: "c6", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    await logAttempt(env, hint, "no_answer", "James", async () => {
      return new Response(JSON.stringify({ message_id: "m-night", thread_id: "t-night" }), { status: 200 });
    });
    const rec = await env.SESSIONS.get("cycle:rec:c6", "json");
    rec.sends.cte2 = { template: "cte2", status: "pending", dueAt: "2026-01-01T10:00", attempts: 0 };
    await env.SESSIONS.put("cycle:rec:c6", JSON.stringify(rec));
    let sends = 0;
    const night = await runDueSends(env, new Date("2026-09-09T08:00:00Z"), async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "night" }), { status: 200 });
    });
    assert.equal(night.sent, 0);
    assert.equal(sends, 0);
  });
});

describe("Yard cycle surfaces", () => {
  it("wires Worker cron, AgentMail hook, and contact-card buttons", () => {
    assert.match(http, /\/cycle\/attempt/);
    assert.match(index, /\/cycle\/hooks\/agentmail/);
    assert.match(index, /async scheduled/);
    assert.match(page, /Logged attempt/);
    assert.match(page, /No answer/);
    assert.match(page, /Replied/);
    assert.match(page, /Override CTE/);
    assert.match(page, /Mark paid/);
    assert.match(page, /function paintCycle/);
    assert.match(page, /\/cycle\/paid/);
    assert.match(page, /skipEmail: true/);
    assert.match(page, /Retry Next Steps/);
    assert.match(page, /cycle-paid-retry/);
    assert.match(engineSrc, /loadNextStepsPdf/);
    assert.doesNotMatch(engineSrc, /url:\s*pdfUrl|filename: "CBSS-Next-Steps-After-Your-Order\.pdf", content_type: "application\/pdf", url:/);
  });
});

describe("AgentMail always CCs Christopher", () => {
  it("puts Christopher first and does not duplicate or self-cc", () => {
    const tracking = ownerTrackingCc();
    const mixed = withOwnerTrackingCc(["gary@test.com"], ["aliyah@cbshippingsolutions.com", tracking.replace("c", "C")]);
    assert.equal(mixed[0], tracking);
    assert.deepEqual(mixed, [tracking, "aliyah@cbshippingsolutions.com"]);
    assert.deepEqual(withOwnerTrackingCc(["gary@test.com"], []), [tracking]);
    assert.deepEqual(withOwnerTrackingCc([tracking], ["james@cbshippingsolutions.com"]), [
      "james@cbshippingsolutions.com",
    ]);
  });

  it("forces Christopher onto CC even when the caller omits cc", async () => {
    const calls = [];
    const result = await sendAgentMail(
      { AGENTMAIL_API_KEY: "am_test" },
      { to: ["gary@test.com"], subject: "Ping", text: "Hello" },
      async (url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ message_id: "m-cc", thread_id: "t-cc" }), { status: 200 });
      },
    );
    assert.equal(result.ok, true);
    const payload = JSON.parse(calls[0].init.body);
    assert.deepEqual(payload.to, ["gary@test.com"]);
    assert.ok(payload.cc[0].startsWith("christopher@"));
    assert.deepEqual(payload.cc, [ownerTrackingCc()]);
  });

  it("CCs Christopher on CTE mail and on rep-reply alerts", async () => {
    const cteCalls = [];
    const env = envUsers([james]);
    const hint = { id: "c-cc-cte", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    await logAttempt(env, hint, "no_answer", "James", async (_url, init) => {
      cteCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ message_id: "cte-cc", thread_id: "t-cte-cc" }), { status: 200 });
    });
    assert.equal(cteCalls.length, 1);
    assert.ok(cteCalls[0].cc.some((addr) => addr.startsWith("christopher@")));
    assert.deepEqual(cteCalls[0].to, ["gary@test.com"]);

    const alertCalls = [];
    await stopForReply(env, hint, "agentmail", "agentmail", async (_url, init) => {
      alertCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ message_id: "alert-cc", thread_id: "t-alert" }), { status: 200 });
    });
    assert.equal(alertCalls.length, 1);
    assert.deepEqual(alertCalls[0].to, ["james@cbshippingsolutions.com"]);
    assert.ok(alertCalls[0].cc.some((addr) => addr.startsWith("christopher@")));
  });
});
