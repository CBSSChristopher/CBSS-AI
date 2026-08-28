import assert from "node:assert/strict";
import { test } from "node:test";
import { websiteLeadNote, websiteLeadPayload } from "../src/website-lead.js";
import { backupCounts, buildCrmSnapshot } from "../src/backup.js";

test("website lead keeps the form fields and invents no price", () => {
  const payload = websiteLeadPayload({
    name: "Pat Harbor",
    phone: "8703232593",
    zip: "72201",
    use: "Jobsite storage",
    company: "Harbor Test Co",
    requestId: "abc-1"
  });
  assert.equal(payload.error, undefined);
  assert.equal(payload.owner, "New/Unassigned");
  assert.equal(payload.source, "Quote Form");
  assert.equal(payload.stage, "New Lead");
  assert.equal(payload.clientType, "Commercial");
  assert.equal(payload.amount, undefined);
  assert.equal(payload.wholesale, undefined);
  assert.equal(payload.skipDeal, true);
  assert.equal(payload.skipStageOnExisting, true);
  assert.match(payload.notes, /Harbor Test Co/);
  assert.match(payload.notes, /Do not invent a price/);
  assert.match(websiteLeadNote(payload), /Request id: abc-1/);
});

test("residential use maps to Residential and missing fields fail closed", () => {
  const home = websiteLeadPayload({
    name: "Pat",
    phone: "8703232593",
    zip: "72201",
    use: "Residential / farm storage"
  });
  assert.equal(home.clientType, "Residential");
  const missing = websiteLeadPayload({ name: "Pat", phone: "870" });
  assert.match(missing.error, /required/);
});

test("CRM snapshot counts edits, notes, and deals", () => {
  const snap = buildCrmSnapshot({
    contactEdits: { 1: { owner: "Kyle" } },
    notes: { 1: [{ text: "hi" }] },
    deals: [{ id: 9 }],
    contactsAdded: [{ id: 1 }],
    followups: { 1: { nextAction: "Call" } }
  }, "2026-08-28T02:00:00.000Z");
  assert.equal(snap.at, "2026-08-28T02:00:00.000Z");
  assert.deepEqual(backupCounts(snap), {
    contactEdits: 1,
    notes: 1,
    deals: 1,
    contactsAdded: 1,
    followups: 1
  });
});
