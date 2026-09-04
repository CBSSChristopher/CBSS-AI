import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildProposalSubmit,
  combineProposalLines,
  describeLine,
  notesHaveCostLeak,
  rateSheetSize,
  readProposalLine,
  sanitizeClientNotes,
} from "../src/proposal-lines.ts";
import { pageHtml } from "../src/page.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

function line(over = {}) {
  return readProposalLine({
    size: "20",
    height: "DC",
    config: "standard",
    configLabel: "Standard",
    grade: "WWT",
    qty: 1,
    wholesale: 725,
    delivery: 475,
    margin: 700,
    cash: 1900,
    city: "Memphis, TN",
    fulfillment: "deliver",
    ...over,
  });
}

describe("proposal lines", () => {
  it("keeps a 20 ft WWT next to a 20 ft one-trip as Option A / Option B", () => {
    const wwt = line();
    const one = line({ grade: "OneTrip", configLabel: "Standard", wholesale: 1625, cash: 2800, city: "Charleston, SC" });
    const both = combineProposalLines([wwt, one]);
    assert.equal(both.ok, true);
    assert.equal(both.chooseOne, true);
    assert.equal(both.options.length, 2);
    assert.equal(both.options[0].letter, "A");
    assert.equal(both.options[0].label, "Wind & Water Tight");
    assert.equal(both.options[0].cash, 1900);
    assert.equal(both.options[1].letter, "B");
    assert.equal(both.options[1].label, "One-Trip");
    assert.equal(both.options[1].cash, 2800);
    assert.match(both.options[0].warranty, /5-year/);
    assert.match(both.options[1].warranty, /10-year/);
    assert.match(both.containerDesc, /Option A/);
    assert.match(both.containerDesc, /Option B/);
    assert.equal(both.wholesaleCost, 725 + 1625);
    assert.equal(both.unitPrice, 1900);
    assert.doesNotMatch(both.containerNotes, /\bposted\b/i);
    assert.doesNotMatch(both.containerNotes, /\bdelivery\s+\$?\d/i);
    assert.doesNotMatch(both.containerDesc, /invent/i);
  });

  it("keeps same-grade quantity on one option instead of a second choice", () => {
    const two = combineProposalLines([line({ qty: 2 })]);
    assert.equal(two.ok, true);
    assert.equal(two.chooseOne, false);
    assert.equal(two.options.length, 1);
    assert.equal(two.options[0].qty, 2);
    assert.equal(two.quantity, 2);
    assert.equal(two.unitPrice, 1900);
  });

  it("never puts posted or delivery dollars on client notes", () => {
    const leaked = "20 ft CW · posted 725 · delivery 475 · depot Memphis, TN";
    assert.equal(notesHaveCostLeak(leaked), true);
    const clean = sanitizeClientNotes(leaked);
    assert.doesNotMatch(clean, /\bposted\b/i);
    assert.doesNotMatch(clean, /\bdelivery\s+\$?\d/i);
    assert.match(clean, /depot Memphis, TN/);
    const both = combineProposalLines([
      line(),
      line({ grade: "OneTrip", wholesale: 1625, cash: 2800 }),
    ]);
    assert.equal(notesHaveCostLeak(both.containerNotes), false);
    assert.match(both.containerNotes, /depot Memphis, TN/);
  });

  it("will not build a proposal without a posted wholesale or a customer name", () => {
    assert.equal(readProposalLine({ size: "20", grade: "WWT" }), null);
    const empty = buildProposalSubmit({ customerName: "Pat Lee", repName: "Kyle", repEmail: "kyle@cbshippingsolutions.com", lines: [] });
    assert.equal(empty.ok, false);
    assert.match(empty.error, /posted/);
    const noName = buildProposalSubmit({
      repName: "Kyle",
      repEmail: "kyle@cbshippingsolutions.com",
      lines: [line()],
    });
    assert.equal(noName.ok, false);
    assert.match(noName.error, /Name the customer/);
    const ok = buildProposalSubmit({
      customerName: "Pat Lee",
      repName: "Kyle Hodgkiss",
      repEmail: "kyle@cbshippingsolutions.com",
      zip: "72401",
      lines: [line(), line({ grade: "OneTrip", wholesale: 1625, cash: 2800 })],
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.body.customerName, "Pat Lee");
    assert.equal(ok.body.chooseOne, true);
    assert.equal(ok.body.options.length, 2);
    assert.equal(ok.body.options[0].letter, "A");
    assert.equal(ok.body.options[1].letter, "B");
    assert.match(String(ok.body.containerDesc), /Option A/);
    assert.match(String(ok.body.containerDesc), /Option B/);
    assert.doesNotMatch(String(ok.body.notes), /\bposted\b/i);
    assert.doesNotMatch(String(ok.body.containerNotes), /\bdelivery\s+\$?\d/i);
    const one = buildProposalSubmit({
      customerName: "Pat Lee",
      repName: "Kyle Hodgkiss",
      repEmail: "kyle@cbshippingsolutions.com",
      lines: [line()],
    });
    assert.equal(one.ok, true);
    assert.equal(one.body.chooseOne, false);
    assert.equal(one.body.options.length, 1);
    assert.equal(one.body.unitPrice, 1900);
  });

  it("labels one line in plain box language", () => {
    assert.equal(describeLine(line({ qty: 2 })), "20 ft standard Standard WWT × 2");
  });

  it("buckets 10 and 45 onto the delivery rate sheet only", () => {
    assert.equal(rateSheetSize("10", "standard"), "20ft");
    assert.equal(rateSheetSize("45", "standard"), "40ft");
  });
});

describe("Proposal on The Yard can take a second option", () => {
  it("has Add this option / Add another option and submits through /proposal/submit", () => {
    assert.match(page, /id="p-add"/);
    assert.match(page, /id="p-another"/);
    assert.match(page, /id="p-lines"/);
    assert.match(page, /Add this option/);
    assert.match(page, /Add another option/);
    assert.match(page, /second grade for the client to choose/);
    assert.match(page, /Option A \/ Option B/);
    assert.match(page, /id="p-form"/);
    assert.match(page, /Enter proposal/);
    assert.match(page, /writeProposal/);
    assert.match(page, /requestSubmit/);
    assert.match(page, /api\("\/proposal\/submit"/);
    assert.match(index, /path === "\/proposal\/submit"/);
    assert.match(index, /buildProposalSubmit/);
  });
});
