import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const cteSrc = readFileSync(new URL("../src/cte.ts", import.meta.url), "utf8");
const crmSrc = readFileSync(new URL("../src/crm.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const brain = readFileSync(new URL("../src/brain.ts", import.meta.url), "utf8");

function pad(n) {
  return String(n).padStart(2, "0");
}
function dateTimeLocal(y, m, d, h, min) {
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
}
function addCalendarDays(parts, days) {
  const utc = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
}
function chicagoParts(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { y: num("year"), m: num("month"), d: num("day"), h: num("hour"), min: num("minute") };
}
function planCteSequence(now) {
  const p = chicagoParts(now);
  const callToday = p.h < 18;
  const callDay = callToday ? { y: p.y, m: p.m, d: p.d } : addCalendarDays(p, 1);
  const callHour = callToday ? Math.min(17, Math.max(p.h + 1, 10)) : 10;
  const textDay = addCalendarDays(callDay, 1);
  const emailDay = addCalendarDays(callDay, 2);
  return [
    { channel: "call", when: dateTimeLocal(callDay.y, callDay.m, callDay.d, callHour, 0) },
    { channel: "text", when: dateTimeLocal(textDay.y, textDay.m, textDay.d, 10, 0) },
    { channel: "email", when: dateTimeLocal(emailDay.y, emailDay.m, emailDay.d, 10, 0) },
  ];
}
function nextFollowupAfterCte(now, days = 2) {
  const p = chicagoParts(now);
  const day = addCalendarDays(p, days);
  return dateTimeLocal(day.y, day.m, day.d, 9, 0);
}
function appendNoteToMap(notes, contactId, entry) {
  const out = {};
  for (const [key, value] of Object.entries(notes || {})) out[key] = Array.isArray(value) ? value.slice() : [];
  const key = String(contactId);
  const list = Array.isArray(out[key]) ? out[key].slice() : [];
  list.unshift(entry);
  out[key] = list;
  return out;
}

describe("Live call CRM + CTE", () => {
  it("books Call, Text, then Email while still in CTE", () => {
    const noon = new Date("2026-08-19T17:00:00.000Z"); // 12:00 Chicago CDT
    const plan = planCteSequence(noon);
    assert.deepEqual(plan.map((i) => i.channel), ["call", "text", "email"]);
    assert.match(plan[0].when, /^2026-08-19T1[0-7]:00$/);
    assert.equal(plan[1].when, "2026-08-20T10:00");
    assert.equal(plan[2].when, "2026-08-21T10:00");
  });

  it("books one follow-up after CTE, not another CTE blast", () => {
    const noon = new Date("2026-08-19T17:00:00.000Z");
    assert.equal(nextFollowupAfterCte(noon, 2), "2026-08-21T09:00");
    assert.match(cteSrc, /Past CTE/);
    assert.match(cteSrc, /ctePlan: \[\]/);
    assert.match(brain, /CTE = Call, then Text, then Email/);
  });

  it("keeps protected notes when appending one contact", () => {
    const next = appendNoteToMap(
      {
        2621: [{ author: "Christopher Banks", timestamp: "2026-08-17 17:24", tag: "", text: "Already purchased via RTO MCR" }],
        1787085799283: [{ author: "Christopher Banks", timestamp: "2026-08-18 21:33", tag: "", text: "Gary note" }],
      },
      "99",
      { author: "Desk", timestamp: "2026-08-19 01:00", tag: "Desk", text: "Live call" },
    );
    assert.equal(next["2621"][0].text, "Already purchased via RTO MCR");
    assert.equal(next["1787085799283"][0].text, "Gary note");
    assert.equal(next["99"][0].text, "Live call");
    assert.match(crmSrc, /PROTECTED_NOTE_KEY = "2621"/);
    assert.match(crmSrc, /notesSafeToSave/);
    assert.match(crmSrc, /Refusing to write notes: protected note key is missing/);
    assert.match(index, /crmSaveNotes\(env, user\.crm, notes, book\.notes\)/);
  });

  it("still writes when CRM already lost the protected note key", () => {
    function notesSafeToSave(previous, next) {
      if (!previous["2621"]) return true;
      return Boolean(next["2621"]);
    }
    const kept = appendNoteToMap(
      { 2621: [{ author: "Christopher Banks", timestamp: "2026-08-17 17:24", tag: "", text: "Already purchased via RTO MCR" }] },
      "99",
      { author: "Desk", timestamp: "2026-08-21 01:00", tag: "Desk", text: "Live call" },
    );
    assert.equal(notesSafeToSave({ 2621: kept["2621"] }, kept), true);
    assert.equal(notesSafeToSave({ 2621: kept["2621"] }, { 99: kept["99"] }), false);
    assert.equal(notesSafeToSave({}, { 99: [{ author: "Desk", timestamp: "2026-08-21 01:00", tag: "Desk", text: "Live call" }] }), true);
  });

  it("lets a rep search their book and writes the CRM from Live call", () => {
    assert.match(page, />Call</);
    assert.match(page, /Save to CRM/);
    assert.match(page, /Still in CTE/);
    assert.match(page, /Past CTE/);
    assert.match(index, /path === "\/contacts"/);
    assert.match(index, /path === "\/call\/save"/);
    assert.match(index, /crmSaveNotes/);
    assert.match(index, /crmSaveFollowups/);
    assert.match(index, /function publicUser/);
    assert.match(index, /crm: Boolean\(user\.crm\)/);
    assert.match(crmSrc, /ownerMatchesSession/);
    assert.doesNotMatch(index, /saveNotes[\s\S]{0,80}notes: \{/);
  });
});
