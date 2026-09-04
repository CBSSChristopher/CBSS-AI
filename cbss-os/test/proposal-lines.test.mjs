import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildProposalSubmit,
  combineProposalLines,
  describeLine,
  marginPerUnit,
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
  it("keeps 40 HC WWT, 40 standard WWT, and One-Trip as Option A / B / C", () => {
    const hc = line({ size: "40", height: "HC", grade: "WWT", wholesale: 1850, cash: 3250, city: "Jacksonville, FL" });
    const std = line({ size: "40", height: "DC", grade: "WWT", wholesale: 1800, cash: 3200, city: "Jacksonville, FL" });
    const one = line({ size: "40", height: "HC", grade: "OneTrip", wholesale: 2400, cash: 4100, city: "Jacksonville, FL" });
    const three = combineProposalLines([hc, std, one]);
    assert.equal(three.ok, true);
    assert.equal(three.chooseOne, true);
    assert.equal(three.options.length, 3);
    assert.equal(three.options[0].letter, "A");
    assert.equal(three.options[0].label, "Wind & Water Tight");
    assert.equal(three.options[0].height, "HC");
    assert.equal(three.options[0].cash, 3250);
    assert.equal(three.options[1].letter, "B");
    assert.equal(three.options[1].label, "Wind & Water Tight");
    assert.equal(three.options[1].height, "DC");
    assert.equal(three.options[1].cash, 3200);
    assert.equal(three.options[2].letter, "C");
    assert.equal(three.options[2].label, "One-Trip");
    assert.equal(three.options[2].cash, 4100);
    assert.match(three.containerDesc, /Option A/);
    assert.match(three.containerDesc, /Option B/);
    assert.match(three.containerDesc, /Option C/);
    assert.match(three.containerNotes, /40 ft high cube/);
    assert.match(three.containerNotes, /40 ft standard/);
    assert.match(three.containerNotes, /OneTrip/);
    assert.doesNotMatch(three.containerNotes, /\bposted\b/i);
    assert.doesNotMatch(three.containerNotes, /\bdelivery\s+\$?\d/i);
    const built = buildProposalSubmit({
      customerName: "Frank Payberg",
      email: "fpayberg@gmail.com",
      repName: "Christopher Banks",
      repEmail: "kyle@cbshippingsolutions.com",
      lines: [hc, std, one],
    });
    assert.equal(built.ok, true);
    assert.equal(built.body.options.length, 3);
    assert.equal(built.body.options[2].letter, "C");
    assert.match(String(built.body.containerDesc), /Option C/);
    assert.match(String(built.body.notes), /OneTrip/);
    assert.doesNotMatch(String(built.body.notes), /\bposted\b/i);
  });

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
    assert.equal(both.wholesaleCost, 725);
    assert.equal(both.deliveryCost, 475);
    assert.equal(both.unitPrice, 1900);
    assert.equal(both.netMargin, 1900 - 725 - 475);
    assert.equal(both.options[0].wholesale, 725);
    assert.equal(both.options[1].wholesale, 1625);
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
    assert.equal(two.wholesaleCost, 725);
    assert.equal(two.deliveryCost, 475);
    assert.equal(two.netMargin, 1900 - 725 - 475);
    assert.equal(two.containerDesc, "20 ft standard Standard WWT");
    assert.doesNotMatch(two.containerDesc, /×|x\s*2|\bWWT 2\b/i);
    assert.doesNotMatch(two.containerNotes, /WWT 2|× 2|x 2/i);
    assert.match(two.containerNotes, /depot Memphis, TN/);
  });

  it("keeps $600 per unit on qty 2 instead of mixing totals into margin", () => {
    const tony = line({
      qty: 2,
      wholesale: 1500,
      delivery: 600,
      margin: 600,
      cash: 2700,
      grade: "CW",
      size: "40",
      height: "HC",
    });
    const combined = combineProposalLines([tony]);
    assert.equal(combined.ok, true);
    assert.equal(combined.chooseOne, false);
    assert.equal(combined.quantity, 2);
    assert.equal(combined.wholesaleCost, 1500);
    assert.equal(combined.deliveryCost, 600);
    assert.equal(combined.unitPrice, 2700);
    assert.equal(combined.netMargin, 600);
    assert.equal(marginPerUnit(2700, 1500, 600, "deliver"), 600);
    assert.ok(combined.netMargin >= 300);
    const built = buildProposalSubmit({
      customerName: "Tony Rosales",
      repName: "James",
      repEmail: "james@cbshippingsolutions.com",
      lines: [tony],
    });
    assert.equal(built.ok, true);
    assert.equal(built.body.wholesaleCost, 1500);
    assert.equal(built.body.deliveryCost, 600);
    assert.equal(built.body.unitPrice, 2700);
    assert.equal(built.body.netMargin, 600);
    assert.equal(built.body.quantity, "2");
    assert.equal(built.body.options[0].wholesale, 1500);
    assert.equal(built.body.options[0].qty, 2);
  });

  it("does not sum choose-one wholesale against one cash price", () => {
    const hc = line({ size: "40", height: "HC", grade: "WWT", wholesale: 1850, delivery: 600, margin: 800, cash: 3250, city: "Jacksonville, FL" });
    const std = line({ size: "40", height: "DC", grade: "WWT", wholesale: 1800, delivery: 600, margin: 800, cash: 3200, city: "Jacksonville, FL" });
    const one = line({ size: "40", height: "HC", grade: "OneTrip", wholesale: 2400, delivery: 600, margin: 1100, cash: 4100, city: "Jacksonville, FL" });
    const three = combineProposalLines([hc, std, one]);
    assert.equal(three.chooseOne, true);
    assert.equal(three.wholesaleCost, 1850);
    assert.equal(three.deliveryCost, 600);
    assert.equal(three.unitPrice, 3250);
    assert.equal(three.netMargin, 800);
    assert.notEqual(three.wholesaleCost, 1850 + 1800 + 2400);
    for (const option of three.options) {
      const per = marginPerUnit(option.cash, option.wholesale, option.delivery, option.fulfillment);
      assert.ok(per >= 300, "Option " + option.letter + " per-unit margin " + per);
    }
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

  it("labels one line in plain box language without gluing qty onto the name", () => {
    assert.equal(describeLine(line({ qty: 2 })), "20 ft standard Standard WWT");
    assert.equal(describeLine(line({ qty: 1 })), "20 ft standard Standard WWT");
  });

  it("Tony-style 2 x 40HC One-Trip keeps a clean title and qty 2", () => {
    const tony = line({
      qty: 2,
      size: "40",
      height: "HC",
      grade: "OneTrip",
      wholesale: 2400,
      delivery: 600,
      margin: 750,
      cash: 3750,
      city: "New York, NY",
    });
    const combined = combineProposalLines([tony]);
    assert.equal(combined.ok, true);
    assert.equal(combined.chooseOne, false);
    assert.equal(combined.quantity, 2);
    assert.equal(combined.unitPrice, 3750);
    assert.equal(combined.containerDesc, "40 ft high cube Standard OneTrip");
    assert.doesNotMatch(combined.containerDesc, /OneTrip 2|× 2|x 2/i);
    assert.doesNotMatch(combined.containerNotes, /OneTrip 2|× 2|x 2/i);
    assert.match(combined.containerNotes, /depot New York, NY/);
    const built = buildProposalSubmit({
      customerName: "Tony Rosales",
      email: "tonyandyeya@gmail.com",
      phone: "2035921767",
      delivery: "Waterbury, CT",
      repName: "Christopher Banks",
      repEmail: "kyle@cbshippingsolutions.com",
      lines: [tony],
    });
    assert.equal(built.ok, true);
    assert.equal(built.body.quantity, "2");
    assert.equal(built.body.unitPrice, 3750);
    assert.equal(built.body.containerDesc, "40 ft high cube Standard OneTrip");
    assert.doesNotMatch(String(built.body.notes), /OneTrip 2/);
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
    assert.match(page, /second or third grade for the client to choose/);
    assert.match(page, /Option A \/ Option B \/ Option C/);
    assert.match(page, /Net margin \(per unit\)/);
    assert.match(page, /id="p-form"/);
    assert.match(page, /Enter proposal/);
    assert.match(page, /writeProposal/);
    assert.match(page, /requestSubmit/);
    assert.match(page, /api\("\/proposal\/submit"/);
    assert.match(index, /path === "\/proposal\/submit"/);
    assert.match(index, /buildProposalSubmit/);
  });
});
