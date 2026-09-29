import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFollowupPatch,
  clearFollowupEdits,
  completeFollowupKeys,
  completedActionText,
  completionNote,
  mergeNoteOntoContact,
  recordCompletedTask,
  applyCompleteFollowupState,
  mergeNotesMap,
  resolveCrmAction
} from "../src/followups.js";

test("completeFollowupKeys tombs both string and number ids", () => {
  const next = completeFollowupKeys(
    { 1787155801308: { nextAction: "CTE2", followUpDate: "2026-08-20T11:17" }, other: { nextAction: "Keep" } },
    "1787155801308"
  );
  assert.equal(next["1787155801308"].completed, true);
  assert.equal(next["1787155801308"].nextAction, "");
  assert.deepEqual(next.other, { nextAction: "Keep" });
});

test("applyFollowupPatch honors completed flag instead of preserving the old task", () => {
  const current = { a1: { nextAction: "Call", followUpDate: "2026-08-20T09:00" } };
  const next = applyFollowupPatch(current, { a1: { nextAction: "", followUpDate: "", completed: true } });
  assert.equal(next.a1.completed, true);
  assert.equal(next.a1.nextAction, "");
});

test("applyFollowupPatch can schedule a new task after a completed tombstone", () => {
  const current = { a1: { nextAction: "", followUpDate: "", completed: true, status: "completed", updatedAt: "2026-08-20T12:00:00.000Z" } };
  const next = applyFollowupPatch(current, {
    a1: { nextAction: "Call again", followUpDate: "2026-08-22T09:00", updatedAt: "2026-08-20T13:00:00.000Z" }
  });
  assert.equal(next.a1.nextAction, "Call again");
  assert.equal(next.a1.followUpDate, "2026-08-22T09:00");
  assert.equal(next.a1.updatedAt, "2026-08-20T13:00:00.000Z");
});

test("applyFollowupPatch ignores stale live saves after a completed tombstone", () => {
  const current = { a1: { nextAction: "", followUpDate: "", completed: true, status: "completed", updatedAt: "2026-08-20T23:00:00.000Z" } };
  const stale = applyFollowupPatch(current, { a1: { nextAction: "Call", followUpDate: "2026-08-21T09:00" } });
  assert.equal(stale.a1.completed, true);
  assert.equal(stale.a1.nextAction, "");
  const older = applyFollowupPatch(current, {
    a1: { nextAction: "Call", followUpDate: "2026-08-21T09:00", updatedAt: "2026-08-20T22:00:00.000Z" }
  });
  assert.equal(older.a1.completed, true);
});

test("applyFollowupPatch still refuses an accidental empty wipe", () => {
  const current = { a1: { nextAction: "Call", followUpDate: "2026-08-20T09:00" } };
  const next = applyFollowupPatch(current, { a1: { nextAction: "", followUpDate: "" } });
  assert.deepEqual(next.a1, current.a1);
});

test("applyFollowupPatch updates a live task", () => {
  const current = { a1: { nextAction: "Call", followUpDate: "2026-08-20T09:00" } };
  const next = applyFollowupPatch(current, { a1: { nextAction: "Text", followUpDate: "2026-08-21T10:00" } });
  assert.equal(next.a1.nextAction, "Text");
  assert.equal(next.a1.followUpDate, "2026-08-21T10:00");
  assert.ok(next.a1.updatedAt);
});

test("legacy complete payload with overwritten action still resolves", () => {
  const body = { action: "Call back about 40ft", contactId: "1787155801308" };
  const resolved = resolveCrmAction("POST", null, body);
  assert.equal(resolved.action, "completeFollowup");
  assert.equal(resolved.body.contactId, "1787155801308");
  assert.equal(resolved.body.nextAction, "Call back about 40ft");
});

test("completedActionText ignores the CRM action name", () => {
  assert.equal(completedActionText({ action: "completeFollowup", nextAction: "Call back" }), "Call back");
  assert.equal(completedActionText({ action: "Call back" }), "Follow-up");
});

test("clearFollowupEdits blanks next action on matching contact edits", () => {
  const next = clearFollowupEdits(
    { 9: { owner: "James", nextAction: "Call", followUpDate: "2026-08-20T09:00" } },
    "9"
  );
  assert.equal(next["9"].owner, "James");
  assert.equal(next["9"].nextAction, "");
  assert.equal(next["9"].followUpDate, "");
});

test("applyCompleteFollowupState tombs the live task and records history", () => {
  const next = applyCompleteFollowupState(
    {
      followups: { 9: { nextAction: "Call", followUpDate: "2026-08-21T09:00" } },
      contactEdits: { 9: { owner: "James", nextAction: "Call" } },
      notes: { 9: [{ text: "old" }] },
      completedTasks: {}
    },
    "9",
    "Call",
    "Christopher Banks",
    "2026-08-20 18:22"
  );
  assert.equal(next.followups["9"].completed, true);
  assert.equal(next.contactEdits["9"].nextAction, "");
  assert.equal(next.notes["9"][0].text, "Completed: Call");
  assert.equal(next.completedTasks["9"][0].text, "Call");
  assert.equal(next.completedTasks["9"][0].status, "completed");
});

test("recordCompletedTask keeps newer completions first", () => {
  const next = recordCompletedTask({ 9: [{ text: "old" }] }, "9", { text: "new" });
  assert.equal(next["9"][0].text, "new");
  assert.equal(next["9"][1].text, "old");
});

test("completion note and merge keep existing notes", () => {
  const note = completionNote("CTE2 — Text / email reminder", "Christopher Banks", "2026-08-20 11:22");
  assert.equal(note.tag, "Task");
  assert.equal(note.text, "Completed: CTE2 — Text / email reminder");
  const notes = mergeNoteOntoContact({ 9: [{ text: "old" }] }, 9, note);
  assert.equal(notes["9"][0].text, note.text);
  assert.equal(notes["9"][1].text, "old");
});

test("appendNote stays a known CRM action", () => {
  assert.equal(resolveCrmAction("POST", "appendNote", { action: "appendNote", contactId: "99" }).action, "appendNote");
});

test("saveNotes merges contact keys instead of replacing the whole map", () => {
  const next = mergeNotesMap(
    { 4: [{ text: "keep" }], 2621: [{ text: "protected" }] },
    { 99: [{ text: "desk" }], 4: [{ text: "updated" }] }
  );
  assert.equal(next["4"].some((n) => n.text === "keep"), true);
  assert.equal(next["4"].some((n) => n.text === "updated"), true);
  assert.equal(next["99"][0].text, "desk");
  assert.equal(next["2621"][0].text, "protected");
});
