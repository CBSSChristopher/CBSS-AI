import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFollowupPatch,
  clearFollowupEdits,
  completeFollowupKeys,
  completedActionText,
  completionNote,
  mergeNoteOntoContact
} from "../src/followups.js";

test("completeFollowupKeys removes both string and number ids", () => {
  const next = completeFollowupKeys(
    { 1787155801308: { nextAction: "CTE2", followUpDate: "2026-08-20T11:17" }, other: { nextAction: "Keep" } },
    "1787155801308"
  );
  assert.equal(next["1787155801308"], undefined);
  assert.equal(next[1787155801308], undefined);
  assert.deepEqual(next.other, { nextAction: "Keep" });
});

test("applyFollowupPatch honors completed flag instead of preserving the old task", () => {
  const current = { a1: { nextAction: "Call", followUpDate: "2026-08-20T09:00" } };
  const next = applyFollowupPatch(current, { a1: { nextAction: "", followUpDate: "", completed: true } });
  assert.equal(next.a1, undefined);
});

test("applyFollowupPatch still refuses an accidental empty wipe", () => {
  const current = { a1: { nextAction: "Call", followUpDate: "2026-08-20T09:00" } };
  const next = applyFollowupPatch(current, { a1: { nextAction: "", followUpDate: "" } });
  assert.deepEqual(next.a1, current.a1);
});

test("applyFollowupPatch updates a live task", () => {
  const current = { a1: { nextAction: "Call", followUpDate: "2026-08-20T09:00" } };
  const next = applyFollowupPatch(current, { a1: { nextAction: "Text", followUpDate: "2026-08-21T10:00" } });
  assert.deepEqual(next.a1, { nextAction: "Text", followUpDate: "2026-08-21T10:00" });
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

test("completion note and merge keep existing notes", () => {
  const note = completionNote("CTE2 — Text / email reminder", "Christopher Banks", "2026-08-20 11:22");
  assert.equal(note.tag, "Task");
  assert.equal(note.text, "Completed: CTE2 — Text / email reminder");
  const notes = mergeNoteOntoContact({ 9: [{ text: "old" }] }, 9, note);
  assert.equal(notes["9"][0].text, note.text);
  assert.equal(notes["9"][1].text, "old");
});
