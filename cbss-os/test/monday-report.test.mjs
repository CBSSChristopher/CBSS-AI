import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { buildMondayReport } from "../src/monday-report.ts";
import { pageHtml } from "../src/page.ts";

const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("Monday book", () => {
  it("counts the pile and stored proposal dollars only", () => {
    const report = buildMondayReport({
      contacts: [
        { id: "1", name: "Pat", owner: "James", status: "Working", source: "Desk" },
        { id: "2", name: "Lee", owner: "New/Unassigned", status: "New Lead", source: "Facebook" },
        { id: "3", name: "Kim", owner: "Christopher Banks", status: "Proposal Sent", amount: "4200", source: "Proposal Tool" },
        { id: "4", name: "Blank", owner: "James", status: "Proposal Sent", source: "Proposal Tool" },
      ],
      contactsAdded: [{ id: "5", name: "Ada", owner: "New/Unassigned", status: "New", source: "Facebook" }],
      contactEdits: {},
      deals: [{ id: "d1" }],
      followups: { "1": { nextAction: "Call", followUpDate: "2026-09-14T09:00" }, "3": { completed: true } },
    });
    assert.equal(report.contacts, 4);
    assert.equal(report.added, 1);
    assert.equal(report.deals, 1);
    assert.equal(report.openFollowups, 1);
    assert.equal(report.unassigned, 2);
    assert.equal(report.facebookBook, 2);
    assert.equal(report.facebookUnassigned, 2);
    assert.equal(report.stages.Working, 1);
    assert.equal(report.stages.New, 2);
    assert.equal(report.proposalSentWithAmount, 1);
    assert.equal(report.proposalSentBlank, 1);
    assert.equal(report.storedProposalDollars, 4200);
    assert.match(report.note, /no invented price/i);
    assert.match(report.note, /does not email/);
  });

  it("is Christopher-only on The Yard and does not send", () => {
    const page = pageHtml();
    assert.match(page, /crm-monday-tab/);
    assert.match(page, /\/report\/monday/);
    assert.match(index, /Monday book is for Christopher only/);
    assert.match(index, /buildMondayReport/);
    assert.doesNotMatch(index, /\/report\/monday[\s\S]{0,400}sendAgentMail/);
  });
});
