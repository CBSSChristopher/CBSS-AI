import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildProposalSubmit,
  combineProposalLines,
  describeLine,
  readProposalLine,
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
  it("keeps a 20 ft WWT next to a 20 ft one-trip as two boxes", () => {
    const wwt = line();
    const one = line({ grade: "OneTrip", configLabel: "Standard", wholesale: 1625, cash: 2800 });
    const both = combineProposalLines([wwt, one]);
    assert.equal(both.ok, true);
    assert.match(both.containerDesc, /20 ft standard Standard WWT/);
    assert.match(both.containerDesc, /20 ft standard Standard OneTrip/);
    assert.equal(both.quantity, 2);
    assert.equal(both.wholesaleCost, 725 + 1625);
    assert.equal(both.unitPrice, 1900 + 2800);
    assert.doesNotMatch(both.containerDesc, /invent/i);
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
    assert.match(String(ok.body.containerDesc), /WWT/);
    assert.match(String(ok.body.containerDesc), /OneTrip/);
  });

  it("labels one line in plain box language", () => {
    assert.equal(describeLine(line({ qty: 2 })), "20 ft standard Standard WWT × 2");
  });
});

describe("Proposal on The Yard can take a second box", () => {
  it("has Add this box / Add another box and submits through /proposal/submit", () => {
    assert.match(page, /id="p-add"/);
    assert.match(page, /id="p-another"/);
    assert.match(page, /id="p-lines"/);
    assert.match(page, /Add this box/);
    assert.match(page, /Add another box/);
    assert.match(page, /id="p-form"/);
    assert.match(page, /Enter proposal/);
    assert.match(page, /writeProposal/);
    assert.match(page, /requestSubmit/);
    assert.match(page, /api\("\/proposal\/submit"/);
    assert.match(index, /path === "\/proposal\/submit"/);
    assert.match(index, /buildProposalSubmit/);
  });
});
