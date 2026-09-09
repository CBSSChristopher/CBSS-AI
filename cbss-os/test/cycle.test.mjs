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
import { resolveAssignedRep } from "../src/cycle/rep.ts";
import { normalizeLifecycle, legacyStatusFor } from "../src/cycle/lifecycle.ts";
import { fireTemplate, logAttempt, markContactPaid, reassignOwner, runDueSends, stopForReply } from "../src/cycle/engine.ts";
import { paidBody } from "../src/cycle/templates.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const http = readFileSync(new URL("../src/cycle/http.ts", import.meta.url), "utf8");

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
    assert.equal(hit.user.email, "james@cbshippingsolutions.com");
    const unassigned = resolveAssignedRep("New/Unassigned", [james]);
    assert.equal(unassigned.ok, false);
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
  });
});
