import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("tasks tab exposes a Complete button and completeTask handler", () => {
  assert.match(html, /function completeTask\(/);
  assert.match(html, /onclick="completeTask\(\$\{JSON\.stringify\(String\(c\.id\)\)\}, event\)">Complete<\/button>/);
  assert.match(html, /action: 'getNotes'/);
  assert.match(html, /omitNotes: '1'/);
  assert.match(html, /function onSearchInput\(/);
  assert.match(html, /JSON\.stringify\(Object\.assign\(\{\}, payload \|\| \{\}, \{ action \}\)\)/);
  assert.match(html, /nextAction: actionText/);
  assert.match(html, /Schedule another follow-up/);
  assert.match(html, /function offerNextFollowup\(/);
  assert.doesNotMatch(html, /apiSave\('completeFollowup', \{ contactId: String\(c\.id\), action: actionText \}\)/);
});

test("worker still serves the CRM data routes used by the desk", async () => {
  const worker = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /action === "completeFollowup"/);
  assert.match(worker, /action === "getNotes"/);
  assert.match(worker, /omitNotes/);
  assert.match(worker, /saveFollowups/);
  assert.doesNotMatch(worker, /await migrateQuoted\(store, state\);/);
  assert.doesNotMatch(worker, /await migrateOwners\(store, state, archive\);/);
});
