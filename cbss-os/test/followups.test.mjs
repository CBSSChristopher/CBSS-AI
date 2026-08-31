import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  FOLLOWUP_CLOCK_SLACK_MS,
  applyLiveCrmFollowupPatch,
  isDoneOnDay,
  rewriteCrmWrite,
  stampFollowupPatch,
  stampFollowupRow,
  taskDay,
} from "../src/followups.ts";
import { pageHtml } from "../src/page.ts";
import { BRAND } from "../src/brand.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

const NOW = Date.parse("2026-08-31T16:24:00.000Z");
const TOMBSTONE_AT = "2026-08-31T16:24:00.500Z";

function tombstone(at = TOMBSTONE_AT) {
  return { nextAction: "", followUpDate: "", completed: true, status: "completed", updatedAt: at };
}

describe("live CRM drops a next follow-up after complete", () => {
  it("drops a save that has no updatedAt", () => {
    const merged = applyLiveCrmFollowupPatch(
      { "88": tombstone() },
      { "88": { nextAction: "Call Monday", followUpDate: "2026-09-01T09:00" } },
      NOW,
    );
    assert.equal(merged["88"].completed, true);
    assert.equal(merged["88"].nextAction, "");
  });

  it("drops a save whose clock is behind the complete tombstone", () => {
    const merged = applyLiveCrmFollowupPatch(
      { "88": tombstone() },
      { "88": { nextAction: "Call Monday", followUpDate: "2026-09-01T09:00", updatedAt: "2026-08-31T16:23:59.000Z" } },
      NOW,
    );
    assert.equal(merged["88"].completed, true);
    assert.equal(merged["88"].nextAction, "");
  });

  it("keeps a stamped save even when the phone clock is behind the server", () => {
    const incoming = stampFollowupPatch(
      { "88": { nextAction: "Call Monday", followUpDate: "2026-09-01T09:00" } },
      NOW,
    );
    const merged = applyLiveCrmFollowupPatch({ "88": tombstone() }, incoming, NOW);
    assert.equal(merged["88"].nextAction, "Call Monday");
    assert.equal(merged["88"].followUpDate, "2026-09-01T09:00");
    assert.notEqual(merged["88"].completed, true);
    assert.ok(Date.parse(String(incoming["88"].updatedAt)) >= Date.parse(TOMBSTONE_AT));
    assert.ok(FOLLOWUP_CLOCK_SLACK_MS >= 60000);
  });
});

describe("done today stays on the book", () => {
  it("matches completed timestamps on that day", () => {
    assert.equal(taskDay("2026-08-31 16:05"), "2026-08-31");
    assert.equal(taskDay("2026-08-31T16:05:00.000Z"), "2026-08-31");
    assert.equal(
      isDoneOnDay([{ timestamp: "2026-08-31 16:05", text: "FU", author: "James" }], "2026-08-31"),
      true,
    );
    assert.equal(
      isDoneOnDay([{ timestamp: "2026-08-30 16:05", text: "FU", author: "James" }], "2026-08-31"),
      false,
    );
  });
});

describe("The Yard stamps follow-up writes", () => {
  it("marks a live row open and pushes updatedAt ahead of the clock", () => {
    const row = stampFollowupRow({ nextAction: "Text James", followUpDate: "" }, NOW);
    assert.equal(row.completed, false);
    assert.equal(row.status, "open");
    assert.equal(row.updatedAt, new Date(NOW + FOLLOWUP_CLOCK_SLACK_MS).toISOString());
  });

  it("leaves a true complete tombstone completed", () => {
    const row = stampFollowupRow({ nextAction: "", followUpDate: "", completed: true, status: "completed" }, NOW);
    assert.equal(row.completed, true);
    assert.equal(row.nextAction, "");
  });

  it("rewrites saveFollowups bodies and leaves other CRM writes alone", () => {
    const saved = rewriteCrmWrite("saveFollowups", {
      action: "saveFollowups",
      followups: { "12": { nextAction: "Call", followUpDate: "" } },
    }, NOW);
    assert.equal(saved.followups["12"].completed, false);
    assert.ok(String(saved.followups["12"].updatedAt).length > 10);
    const note = rewriteCrmWrite("appendNote", { action: "appendNote", text: "hi" }, NOW);
    assert.equal(note.text, "hi");
  });

  it("stamps CRM follow-up saves in the house proxy", () => {
    assert.match(index, /stampCrmFollowupBody/);
    assert.match(index, /rewriteCrmWrite/);
  });
});

describe("complete then schedule does not drop the row", () => {
  it("reads the next-action fields before complete and keeps the row to set the next one", () => {
    assert.match(page, /persistOpenFollowup/);
    assert.match(page, /followupStamp/);
    assert.match(page, /pendingNext/);
    assert.match(page, /Just completed\. Set the next follow-up\./);
    assert.match(page, /The new follow-up stays on the book/);
    assert.match(page, /data-next-act/);
    const js = page.slice(page.indexOf("async function completeWork"));
    const readNext = js.indexOf("workFields(id, row)");
    const completeCall = js.indexOf("completeFollowup");
    const persist = js.indexOf("persistOpenFollowup");
    assert.ok(readNext >= 0 && completeCall > readNext && persist > completeCall);
  });

  it("is build 16", () => {
    assert.equal(BRAND.stamp, "build 16 · The Yard");
    assert.match(page, /build 16 · The Yard/);
  });

  it("keeps people finished today on the book", () => {
    assert.match(page, /Done today/);
    assert.match(page, /doneTodayRows/);
    assert.match(page, /crm-list-note/);
    assert.match(page, /__mine__/);
    const fill = page.slice(page.indexOf("function fillOwners"));
    assert.match(fill, /crm-owner"\)\.value = "__mine__"/);
  });

  it("schedules from the clicked row so Tasks does not steal empty inputs", () => {
    assert.match(page, /function workFields\(id, row\)/);
    assert.match(page, /data-sched-box/);
    assert.match(page, /scheduleWork\(sched\.getAttribute\("data-sched"\), sched\.closest\("tr"\)\)/);
    assert.match(page, /completeWork\(done\.getAttribute\("data-done"\), done\.closest\("tr"\)\)/);
    assert.match(page, /Type the next action or pick a date, then Save next follow-up/);
    assert.match(page, /Next follow-up saved\. It stays on Follow-ups/);
  });
});
