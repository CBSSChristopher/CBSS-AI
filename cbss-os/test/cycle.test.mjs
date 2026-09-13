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
import { applyOverride, applyNoAnswerSchedule, CTE_OFFSETS, dueTemplates, scheduleFromCte1 } from "../src/cycle/ladder.ts";
import { emptyRecord, writeRecord } from "../src/cycle/store.ts";
import { OFFICE_PHONE, cleanScheduleUrl, resolveAssignedRep, rosterCompanyEmail, rosterPhone, rosterScheduleUrl, rosterTitle } from "../src/cycle/rep.ts";
import { normalizeLifecycle, legacyStatusFor } from "../src/cycle/lifecycle.ts";
import { fireTemplate, logAttempt, markBadNumber, markContactPaid, reassignOwner, runDueSends, stopForReply } from "../src/cycle/engine.ts";
import { handleCycleAuthed } from "../src/cycle/http.ts";
import { paidBody, renderTemplate } from "../src/cycle/templates.ts";
import {
  ownerTrackingCc,
  sendAgentMail,
  withOwnerTrackingCc,
} from "../src/cycle/agentmail.ts";
import { applyLiveCrmFollowupPatch, isCompletedFollowup, stampFollowupRow } from "../src/followups.ts";
import { TEAM_OWNERS } from "../src/brand.ts";

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

  it("schedules CTE2/3/4 from CTE1 as +1 / +3 / +7 business days", () => {
    const dates = scheduleFromCte1({ y: 2026, m: 9, d: 14 });
    assert.equal(dates.cte2, "2026-09-15T10:00");
    assert.equal(dates.cte3, "2026-09-17T10:00");
    assert.equal(dates.cte4, "2026-09-23T10:00");
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
    assert.equal(legacyStatusFor("Working"), "Working");
    assert.equal(legacyStatusFor("Not interested"), "Not interested");
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

describe("CTE copy is an introduction with the rep on the footer", () => {
  const vars = {
    clientFirstName: "Kamil",
    clientName: "Kamil Dziecina",
    repName: "Christopher Banks",
    repEmail: rosterCompanyEmail("Christopher Banks"),
    repPhone: rosterPhone("Christopher Banks"),
    repTitle: rosterTitle("Christopher Banks"),
  };

  it("keeps CTE1 as a hello, not a price disclaimer or a fake earlier call", () => {
    const mail = renderTemplate("cte1", vars);
    assert.match(mail.subject, /Kamil, Christopher Banks here/);
    assert.match(mail.text, /This is Christopher Banks with CB Shipping Solutions/);
    assert.match(mail.text, /wanted to introduce myself/);
    assert.match(mail.text, /Reply to this email or call me/);
    assert.doesNotMatch(mail.text, /tried you earlier/);
    assert.doesNotMatch(mail.text, /put a real name on the follow-up/);
    assert.doesNotMatch(mail.text, /I will not invent a price/);
    assert.doesNotMatch(mail.text, /what is posted/);
    assert.ok(mail.text.includes(rosterCompanyEmail("Christopher Banks")));
    assert.match(mail.text, /\(870\) 682-3867/);
    assert.match(mail.text, /President \/ Owner/);
  });

  it("puts each known rep's phone on CTE2/3/4 and uses the office line when we do not have a direct one", () => {
    const james = renderTemplate("cte2", { ...vars, repName: "James", repEmail: "james@cbshippingsolutions.com", repPhone: rosterPhone("James"), repTitle: rosterTitle("James") });
    const julia = renderTemplate("cte3", { ...vars, repName: "Julia", repEmail: "julia@cbshippingsolutions.com", repPhone: rosterPhone("Julia"), repTitle: rosterTitle("Julia") });
    const last = renderTemplate("cte4", vars);
    assert.match(james.text, /\(870\) 260-7592/);
    assert.match(james.text, /james@cbshippingsolutions\.com/);
    assert.match(julia.text, /\(870\) 682-3867/);
    assert.doesNotMatch(julia.text, /\(870\) 323-1747/);
    assert.doesNotMatch(julia.text, /\(870\) 323-2593/);
    assert.match(julia.text, /julia@cbshippingsolutions\.com/);
    assert.match(last.text, /\(870\) 682-3867/);
    assert.doesNotMatch(james.text, /I will not invent a price/);
    assert.doesNotMatch(last.text, /tried you earlier/);
  });

  it("signs every roster rep with their company email, title, and a real phone", () => {
    for (const owner of TEAM_OWNERS) {
      if (owner === "New/Unassigned") continue;
      const mail = renderTemplate("cte1", {
        clientFirstName: "Pat",
        clientName: "Pat Lee",
        repName: owner,
        repEmail: rosterCompanyEmail(owner),
        repPhone: rosterPhone(owner),
        repTitle: rosterTitle(owner),
      });
      assert.ok(mail.text.includes(rosterCompanyEmail(owner)), owner);
      assert.ok(mail.text.includes(rosterTitle(owner)), owner);
      assert.match(mail.text, /\(\d{3}\) \d{3}-\d{4}/);
      assert.ok(mail.text.includes("CB Shipping Solutions"));
    }
    assert.equal(rosterPhone("Unknown Rep"), OFFICE_PHONE);
  });

  it("sends that same CTE1 body through AgentMail for James", async () => {
    let body = "";
    const env = envUsers([james]);
    const hint = { id: "c-intro", name: "Kamil Dziecina", email: "dkjbuilder@yahoo.com", owner: "James" };
    await logAttempt(env, hint, "no_answer", "James", async (_url, init) => {
      body = String(init && init.body || "");
      return new Response(JSON.stringify({ message_id: "m-intro", thread_id: "t-intro" }), { status: 200 });
    });
    assert.match(body, /wanted to introduce myself/);
    assert.match(body, /james@cbshippingsolutions\.com/);
    assert.match(body, /870\) 260-7592/);
    assert.doesNotMatch(body, /tried you earlier/);
    assert.doesNotMatch(body, /I will not invent a price/);
    assert.doesNotMatch(body, /Prefer a Google Meet/);
  });

  it("adds the assigned rep's Google Meet link when one is saved, and never invents one", () => {
    assert.equal(cleanScheduleUrl("javascript:alert(1)"), "");
    assert.equal(cleanScheduleUrl("http://calendar.google.com/x"), "");
    assert.equal(rosterScheduleUrl("James"), "");
    const meet = "https://calendar.app.google.com/cbss-james-test";
    const withMeet = { ...vars, repName: "James", repEmail: "james@cbshippingsolutions.com", repPhone: rosterPhone("James"), repTitle: rosterTitle("James"), repScheduleUrl: meet };
    const mail = renderTemplate("cte1", withMeet);
    assert.match(mail.text, /schedule a Google Meet with the link below/);
    assert.match(mail.text, /Prefer a Google Meet\? Schedule a time with me:/);
    assert.match(mail.text, /calendar\.app\.google\.com\/cbss-james-test/);
    const paid = renderTemplate("paid", withMeet);
    assert.match(paid.text, /calendar\.app\.google\.com\/cbss-james-test/);
    const bare = renderTemplate("cte1", vars);
    assert.doesNotMatch(bare.text, /Prefer a Google Meet/);
    assert.equal(rosterScheduleUrl("James", { MEET_LINKS_JSON: JSON.stringify({ James: meet }) }), new URL(meet).toString());
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
    assert.equal(rec.sends.cte4.dueAt, "2026-09-24T10:00");
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

describe("CTE ladder schedules and the rep can finish", () => {
  it("keeps CTE4 at +7 business days in the offset table", () => {
    assert.deepEqual(CTE_OFFSETS, { CTE2: 1, CTE3: 3, CTE4: 7 });
  });

  it("No answer queues CTE2/3/4 and cron sends each when due, then parks after CTE4", async () => {
    const sent = [];
    const env = envUsers([james]);
    const hint = { id: "c-ladder", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    const fetchOk = async (_url, init) => {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ message_id: "m-" + sent.length, thread_id: "t-ladder" }), { status: 200 });
    };
    const noAnswer = await logAttempt(env, hint, "no_answer", "James", fetchOk);
    assert.equal(noAnswer.rec.sends.cte1.status, "sent");
    assert.equal(noAnswer.rec.sends.cte2.status, "pending");
    assert.equal(noAnswer.rec.sends.cte3.status, "pending");
    assert.equal(noAnswer.rec.sends.cte4.status, "pending");
    assert.match(http, /trim\(\) === "no_answer"/);

    const rec = await env.SESSIONS.get("cycle:rec:c-ladder", "json");
    rec.cte1Date = "2026-09-14";
    applyNoAnswerSchedule(rec);
    await writeRecord(env, rec);
    assert.equal(rec.sends.cte2.dueAt, "2026-09-15T10:00");
    assert.equal(rec.sends.cte3.dueAt, "2026-09-17T10:00");
    assert.equal(rec.sends.cte4.dueAt, "2026-09-23T10:00");

    const early = await runDueSends(env, new Date("2026-09-14T15:00:00Z"), fetchOk);
    assert.equal(early.sent, 0);

    const day2 = await runDueSends(env, new Date("2026-09-15T15:00:00Z"), fetchOk);
    assert.equal(day2.sent, 1);
    const after2 = await env.SESSIONS.get("cycle:rec:c-ladder", "json");
    assert.equal(after2.sends.cte2.status, "sent");
    assert.equal(after2.sends.cte3.status, "pending");
    assert.equal(after2.sends.cte4.status, "pending");
    assert.match(sent.at(-1).subject, /checking in from CB Shipping Solutions/);

    const day3 = await runDueSends(env, new Date("2026-09-17T15:00:00Z"), fetchOk);
    assert.equal(day3.sent, 1);
    const after3 = await env.SESSIONS.get("cycle:rec:c-ladder", "json");
    assert.equal(after3.sends.cte3.status, "sent");
    assert.equal(after3.sends.cte4.status, "pending");
    assert.match(sent.at(-1).subject, /still here if you want the next step/);

    const day4 = await runDueSends(env, new Date("2026-09-23T15:00:00Z"), fetchOk);
    assert.equal(day4.sent, 1);
    const after4 = await env.SESSIONS.get("cycle:rec:c-ladder", "json");
    assert.equal(after4.sends.cte4.status, "sent");
    assert.equal(after4.cteStage, "parked");
    assert.equal(after4.nextDue, "");
    assert.equal(dueTemplates(after4, new Date("2026-09-30T15:00:00Z")).length, 0);
    assert.ok(after4.events.some((e) => /CTE4 sent\. Ladder parked/.test(e.text)));
    assert.match(sent.at(-1).subject, /last note from James/);
  });

  it("Replied skips remaining CTE mail and the rep can Complete the CRM follow-up", async () => {
    const env = envUsers([james]);
    const hint = { id: "c-finish", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    await logAttempt(env, hint, "no_answer", "James", async () => {
      return new Response(JSON.stringify({ message_id: "m-fin", thread_id: "t-fin" }), { status: 200 });
    });
    const replied = await handleCycleAuthed("/cycle/replied", "POST", env, james, hint, new URLSearchParams());
    assert.equal(replied.status, 200);
    assert.equal(replied.body.cycle.stopped, true);
    assert.equal(replied.body.cycle.cteStage, "parked");
    assert.equal(replied.body.cycle.sends.cte2.status, "skipped");
    assert.equal(replied.body.cycle.sends.cte3.status, "skipped");
    assert.equal(replied.body.cycle.sends.cte4.status, "skipped");
    assert.equal(dueTemplates(replied.body.cycle, new Date("2026-12-01T15:00:00Z")).length, 0);

    const open = stampFollowupRow(
      { nextAction: "Call — first outreach", followUpDate: "2026-09-14T10:00" },
      Date.parse("2026-09-14T15:00:00Z"),
    );
    assert.equal(open.completed, false);
    assert.equal(open.status, "open");
    const book = applyLiveCrmFollowupPatch({}, { "c-finish": open });
    const done = applyLiveCrmFollowupPatch(book, {
      "c-finish": {
        nextAction: "",
        followUpDate: "",
        completed: true,
        status: "completed",
        updatedAt: "2026-09-14T16:00:00Z",
      },
    });
    assert.equal(isCompletedFollowup(done["c-finish"]), true);
    assert.match(page, /id="fu-done">Complete</);
    assert.match(page, /action:"completeFollowup"/);
    assert.match(page, /async function completeWork/);
  });

  it("Logged attempt does not start the email ladder; Replied still closes the work", async () => {
    let sends = 0;
    const env = envUsers([james]);
    const hint = { id: "c-logged", name: "Gary Smith", email: "gary@test.com", owner: "James" };
    const logged = await handleCycleAuthed(
      "/cycle/attempt",
      "POST",
      env,
      james,
      { ...hint, outcome: "logged" },
      new URLSearchParams(),
    );
    assert.equal(logged.status, 200);
    assert.equal(logged.body.cycle.lifecycle, "Working");
    assert.equal(logged.body.cycle.cteStage, "CTE1");
    assert.equal(logged.body.cycle.sends.cte2, undefined);
    const { rec } = await logAttempt(env, hint, "logged", "James", async () => {
      sends += 1;
      return new Response(JSON.stringify({ message_id: "nope" }), { status: 200 });
    });
    assert.equal(sends, 0);
    const stopped = await stopForReply(env, hint, "James", "rep");
    assert.equal(stopped.stopped, true);
    assert.equal(dueTemplates(stopped).length, 0);
    assert.equal(rec.sends.cte1, undefined);
  });
});

describe("bad-number campaign", () => {
  it("asks for a working number and does not invent a price or mix door types", () => {
    const mail = renderTemplate("bad_number", {
      clientFirstName: "Pat",
      clientName: "Pat Lee",
      repName: "James",
      repEmail: "james@cbshippingsolutions.com",
      repPhone: rosterPhone("James"),
      repTitle: rosterTitle("James"),
    });
    assert.match(mail.subject, /we cannot reach you at the number we have/);
    assert.match(mail.text, /not a working way to reach you/);
    assert.match(mail.text, /do not know how to contact you/);
    assert.match(mail.text, /good phone number/);
    assert.match(mail.text, /james@cbshippingsolutions\.com/);
    assert.match(mail.text, /\(870\) 260-7592/);
    assert.doesNotMatch(mail.text, /I will not invent a price/);
    assert.doesNotMatch(mail.text, /OS 2D|OS 4D|Full open/);
  });

  it("parks the CTE ladder, sends once, and puts the lead on the campaign list", async () => {
    const sent = [];
    const env = envUsers([james]);
    const hint = { id: "c-bad", name: "Pat Lee", email: "pat@test.com", owner: "James", phone: "8705550199" };
    const fetchOk = async (_url, init) => {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ message_id: "m-bad", thread_id: "t-bad" }), { status: 200 });
    };
    await logAttempt(env, hint, "no_answer", "James", fetchOk);
    const first = await markBadNumber(env, hint, "James", fetchOk);
    assert.equal(first.rec.stopped, true);
    assert.equal(first.rec.stoppedReason, "Bad number");
    assert.equal(first.rec.cteStage, "parked");
    assert.equal(first.rec.sends.bad_number.status, "sent");
    assert.equal(first.rec.sends.cte2.status, "skipped");
    assert.equal(first.legacyStatus, "Email campaign");
    assert.match(sent.at(-1).subject, /we cannot reach you/);
    assert.equal(sent.at(-1).to[0], "pat@test.com");
    assert.ok(sent.at(-1).cc.includes("james@cbshippingsolutions.com"));

    const again = await markBadNumber(env, hint, "James", fetchOk);
    assert.equal(again.send.duplicate, true);
    assert.equal(sent.filter((row) => /cannot reach you/.test(row.subject)).length, 1);

    const viaHttp = await handleCycleAuthed(
      "/cycle/bad-number",
      "POST",
      env,
      james,
      { ...hint, city: "Corning" },
      new URLSearchParams(),
    );
    assert.equal(viaHttp.status, 200);
    assert.equal(viaHttp.body.ok, true);
    assert.equal(viaHttp.body.legacyStatus, "Email campaign");
    assert.equal(viaHttp.body.items[0].id, "c-bad");
    assert.equal(viaHttp.body.items[0].reason, "bad_number");
  });

  it("still parks and lists the lead when there is no email to send", async () => {
    const env = envUsers([james]);
    const hint = { id: "c-no-mail", name: "Pat Lee", owner: "James" };
    const viaHttp = await handleCycleAuthed("/cycle/bad-number", "POST", env, james, hint, new URLSearchParams());
    assert.equal(viaHttp.status, 200);
    assert.equal(viaHttp.body.ok, false);
    assert.match(viaHttp.body.error, /No client email/);
    assert.equal(viaHttp.body.cycle.stoppedReason, "Bad number");
    assert.equal(viaHttp.body.items[0].reason, "bad_number");
    assert.equal(viaHttp.body.legacyStatus, "Email campaign");
  });

  it("does not enroll a closed contact", async () => {
    const env = envUsers([james]);
    const hint = { id: "c-lost", name: "Pat Lee", email: "pat@test.com", owner: "James", lifecycle: "Lost" };
    await handleCycleAuthed("/cycle/lifecycle", "POST", env, james, { ...hint, lifecycle: "Lost" }, new URLSearchParams());
    const viaHttp = await handleCycleAuthed("/cycle/bad-number", "POST", env, james, hint, new URLSearchParams());
    assert.equal(viaHttp.body.ok, false);
    assert.match(viaHttp.body.error, /already closed/);
    assert.deepEqual(viaHttp.body.items, []);
  });
});

describe("Yard cycle surfaces", () => {
  it("wires Worker cron, AgentMail hook, and contact-card buttons", () => {
    assert.match(http, /\/cycle\/attempt/);
    assert.match(index, /\/cycle\/hooks\/agentmail/);
    assert.match(index, /async scheduled/);
    assert.match(page, /id="work-cte"/);
    assert.match(page, /id="work-follow"/);
    assert.match(page, /Didn\\'t answer|Didn't answer/);
    assert.match(page, /Did answer/);
    assert.match(page, /They replied/);
    assert.match(page, /Mark paid/);
    assert.match(page, /function paintCycle/);
    assert.match(page, /function runCteWork/);
    assert.match(page, /function askSend/);
    assert.match(page, /id="send-sure"/);
    assert.match(page, /Send this email\?/);
    assert.match(page, /id="send-sure-no">Cancel</);
    assert.match(page, /\/cycle\/work/);
    assert.match(http, /\/cycle\/work/);
    assert.match(page, /function markBadNumber/);
    assert.match(page, /\/cycle\/bad-number/);
    assert.match(page, /bad-number campaign/);
    assert.match(http, /\/cycle\/bad-number/);
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
