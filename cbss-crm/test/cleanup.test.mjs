import test from "node:test";
import assert from "node:assert/strict";
import { resolveCrmAction } from "../src/followups.js";
import {
  DEFAULT_ADMIN_CLEANUP_CODE,
  adminCleanupCodeOk,
  applyContactCleanup,
  contactById,
  fillKeeperFromDuplicate,
  cleanupAuditNote,
  isFoldedEdit,
  preserveFoldedFlags
} from "../src/cleanup.js";

const keep = {
  id: 101,
  name: "Keep Probe",
  email: "keep-probe@cbshippingsolutions.com",
  phone: "",
  city: "Jonesboro",
  owner: "Christopher Banks"
};
const source = {
  id: 202,
  name: "Dup Probe",
  email: "",
  phone: "8705550100",
  city: "",
  owner: "James",
  dnc: true
};

function baseState() {
  return {
    deals: [{ id: 9, contactId: 202, contactName: "Dup Probe", stage: "Quote" }],
    followups: {
      202: { nextAction: "Call about 40ft", followUpDate: "2026-08-22T09:00" }
    },
    notes: {
      202: [{ author: "James", text: "left voicemail", timestamp: "2026-08-20 09:00" }],
      2621: [{ author: "CRM", text: "protected" }]
    },
    contactsAdded: [keep, source],
    contactEdits: {},
    proposals: {
      202: [{ id: 1, amount: 3200, status: "sent" }]
    },
    archiveRequests: {},
    completedTasks: {
      202: [{ action: "CTE1", at: "2026-08-19" }]
    }
  };
}

test("admin cleanup code is server-side and rejects wrong values", () => {
  assert.equal(adminCleanupCodeOk({}, DEFAULT_ADMIN_CLEANUP_CODE), true);
  assert.equal(adminCleanupCodeOk({ CRM_ADMIN_CODE: "other" }, "other"), true);
  assert.equal(adminCleanupCodeOk({ CRM_ADMIN_CODE: "other" }, DEFAULT_ADMIN_CLEANUP_CODE), false);
  assert.equal(adminCleanupCodeOk({}, ""), false);
  assert.equal(adminCleanupCodeOk({}, "262"), false);
  assert.equal(adminCleanupCodeOk({}, "xxxx"), false);
});

test("fillKeeperFromDuplicate only fills blanks and keeps DNC", () => {
  const next = fillKeeperFromDuplicate(keep, source);
  assert.equal(next.name, "Keep Probe");
  assert.equal(next.email, "keep-probe@cbshippingsolutions.com");
  assert.equal(next.phone, "8705550100");
  assert.equal(next.city, "Jonesboro");
  assert.equal(next.dnc, true);
  assert.equal(next.status, "DNC");
});

test("applyContactCleanup merges the duplicate into the keeper and archives it", () => {
  const result = applyContactCleanup(baseState(), [], {
    sourceId: 202,
    keepId: 101,
    author: "Christopher Banks",
    timestamp: "2026-08-21 10:00"
  });
  assert.equal(result.ok, true);
  const next = result.state;
  assert.equal(next.contactEdits["202"].archived, true);
  assert.equal(next.contactEdits["202"].folded, true);
  assert.equal(next.contactEdits["202"].mergedAway, true);
  assert.equal(next.contactEdits["202"].owner, "");
  assert.equal(next.contactEdits["202"].mergedInto, "101");
  assert.equal(next.contactEdits["101"].owner, "Christopher Banks");
  assert.equal(next.contactEdits["101"].phone, "8705550100");
  assert.equal(next.contactEdits["101"].dnc, true);
  assert.equal(next.archiveRequests["202"].status, "approved");
  assert.equal(next.archiveRequests["202"].reason, "duplicate");
  assert.equal(next.deals[0].contactId, 101);
  assert.equal(next.followups["101"].nextAction, "Call about 40ft");
  assert.equal(next.completedTasks["101"].length, 1);
  assert.equal(next.proposals["101"].length, 1);
  assert.equal(next.notes["2621"][0].text, "protected");
  assert.equal(next.notes["202"][0].text, "left voicemail");
  assert.equal(next.notes["101"][0].tag, "cleanup");
  assert.match(next.notes["101"][0].text, /Merged duplicate contact 202/);
  assert.equal(next.notes["101"].some((n) => n.text === "left voicemail"), true);
});

test("applyContactCleanup refuses same ids, missing rows, and archived targets", () => {
  assert.equal(applyContactCleanup(baseState(), [], { sourceId: 101, keepId: 101 }).ok, false);
  assert.equal(applyContactCleanup(baseState(), [], { sourceId: 202, keepId: 999 }).ok, false);
  const already = baseState();
  already.archiveRequests["202"] = { status: "approved", contactId: "202" };
  assert.match(applyContactCleanup(already, [], { sourceId: 202, keepId: 101 }).error, /already archived/);
});

test("applyContactCleanup does not complete a live keeper follow-up", () => {
  const state = baseState();
  state.followups["101"] = { nextAction: "Text quote", followUpDate: "2026-08-23T11:00" };
  const result = applyContactCleanup(state, [], { sourceId: 202, keepId: 101, timestamp: "2026-08-21 10:00" });
  assert.equal(result.state.followups["101"].nextAction, "Text quote");
  assert.equal(result.state.followups["202"].nextAction, "Call about 40ft");
  assert.notEqual(result.state.followups["202"].completed, true);
});

test("cleanupContact is a known CRM action, not a complete", () => {
  const resolved = resolveCrmAction("POST", "cleanupContact", {
    action: "cleanupContact",
    sourceId: "202",
    keepId: "101",
    contactId: "202",
    code: "x"
  });
  assert.equal(resolved.action, "cleanupContact");
});

test("folded copies leave the assigned owner and stay folded after later edits", () => {
  const result = applyContactCleanup(baseState(), [], { sourceId: 202, keepId: 101, timestamp: "2026-08-21 10:00" });
  assert.equal(isFoldedEdit(result.state.contactEdits["202"]), true);
  const later = preserveFoldedFlags(result.state.contactEdits, { 101: { name: "Keep Probe", owner: "Christopher Banks" } });
  assert.equal(later["202"].folded, true);
  assert.equal(later["202"].owner, "");
  assert.equal(later["202"].mergedInto, "101");
  assert.equal(later["202"].archived, true);
  assert.equal(later["101"].name, "Keep Probe");
});

test("contactById and audit note stay factual", () => {
  assert.equal(contactById([[keep], [source]], 202).name, "Dup Probe");
  const note = cleanupAuditNote(202, "Dup Probe", "Christopher Banks", "2026-08-21 10:00");
  assert.equal(note.tag, "cleanup");
  assert.equal(note.text, "Merged duplicate contact 202 (Dup Probe) into this record.");
});
