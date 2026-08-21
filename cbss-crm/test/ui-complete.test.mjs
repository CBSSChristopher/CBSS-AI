import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("edit contact exposes admin-only coded cleanup", () => {
  assert.match(html, /id="adminCleanupBox"/);
  assert.match(html, /function submitAdminCleanup\(/);
  assert.match(html, /function toggleAdminCleanup\(/);
  assert.match(html, /Clean up duplicate/);
  assert.match(html, /Approval code/);
  assert.match(html, /apiSave\('cleanupContact'/);
  assert.match(html, /resetAdminCleanup\(true\)/);
  assert.match(html, /Boolean\(editing && isChristopher\(\)\)/);
  assert.doesNotMatch(html, /CRM_ADMIN_CODE/);
});

test("list panes can scroll inside the flex shell", () => {
  assert.match(html, /\.main \{ flex: 1; display: flex; overflow: hidden; min-height: 0;/);
  assert.match(html, /\.list-panel \{[\s\S]*?min-height: 0; overflow-y: auto/);
  assert.match(html, /\.table-wrap \{[\s\S]*?min-height: 0; overflow: auto/);
  assert.match(html, /\.contacts-pane \{[\s\S]*?min-height: 0;/);
  assert.match(html, /#app \{[\s\S]*?overflow: hidden;/);
  assert.match(html, /html \{ overflow: hidden; \}/);
  assert.match(html, /-webkit-overflow-scrolling: touch/);
  assert.match(html, /if\(event\.target===this\)dismissNextFollowup\(\)/);
});

test("tasks tab exposes a Complete button and completeTask handler", () => {
  assert.match(html, /function completeTask\(/);
  assert.match(html, /data-complete-id="\$\{esc\(String\(c\.id\)\)\}">Complete<\/button>/);
  assert.match(html, /action: 'getNotes'/);
  assert.match(html, /omitNotes: '1'/);
  assert.match(html, /function onSearchInput\(/);
  assert.match(html, /JSON\.stringify\(Object\.assign\(\{\}, payload \|\| \{\}, \{ action \}\)\)/);
  assert.match(html, /nextAction: actionText/);
  assert.match(html, /Schedule another follow-up/);
  assert.match(html, /function offerNextFollowup\(/);
  assert.match(html, /function showNextFollowupPrompt\(/);
  assert.match(html, /build 10/);
  assert.match(html, /Meta leads/);
  assert.match(html, /function connectMetaPage\(/);
  assert.match(html, /function importMetaLeads\(/);
  assert.match(html, /function persistFollowupRecord\(/);
  assert.match(html, /window\.completeTask = completeTask/);
  assert.match(html, /data-complete-id/);
  assert.match(html, /Completed tasks/);
  assert.match(html, /function completedTasksHtml\(/);
  assert.match(html, /apiSave\('completeFollowup', \{ contactId, nextAction: actionText \}\)/);
  assert.doesNotMatch(html, /confirm\('Mark this task complete/);
  assert.doesNotMatch(html, /apiSave\('completeFollowup', \{ contactId: String\(c\.id\), action: actionText \}\)/);
});

test("worker still serves the CRM data routes used by the desk", async () => {
  const worker = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(wrangler, /"enabled": false/);
  assert.match(worker, /action === "completeFollowup"/);
  assert.match(worker, /crmBuild: 10/);
  assert.match(worker, /x-crm-build", "10"/);
  assert.match(worker, /action === "cleanupContact"/);
  assert.match(worker, /Only Christopher can clean up contacts/);
  assert.doesNotMatch(html, /DEFAULT_ADMIN_CLEANUP_CODE/);
  assert.doesNotMatch(html, /2621/);
  assert.match(worker, /getMetaStatus/);
  assert.match(worker, /importMetaLeads/);
  assert.match(worker, /Cloudflare-CDN-Cache-Control/);
  assert.match(worker, /action === "getNotes"/);
  assert.match(worker, /omitNotes/);
  assert.match(worker, /saveFollowups/);
  assert.match(worker, /resolveCrmAction/);
  assert.match(worker, /Cache-Control/);
  assert.match(worker, /path === "\/fresh"/);
  assert.match(worker, /path === "\/b6"/);
  assert.match(worker, /cache\.purge/);
  assert.doesNotMatch(worker, /await migrateQuoted\(store, state\);/);
  assert.doesNotMatch(worker, /await migrateOwners\(store, state, archive\);/);
});
