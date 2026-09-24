import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  FLEX_TERMS,
  findFlexTerm,
  flexPmt,
  flexSubmitFields,
  quoteFlexBuy,
  readFlexBuyRequest,
  readPercent,
} from "../src/flex-buy.ts";
import { buildProposalSubmit, readProposalLine } from "../src/proposal-lines.ts";
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

describe("flex buy math", () => {
  it("keeps the same term table as the standalone proposal tool", () => {
    assert.deepEqual(FLEX_TERMS.map((row) => row.months), [6, 12, 18, 24, 36, 48, 60, 72]);
    assert.equal(findFlexTerm(24)?.apr, 0.16);
    assert.equal(findFlexTerm(9), null);
  });

  it("reads 10 and 0.10 as ten percent", () => {
    assert.equal(readPercent(10, 0.1, 0.05, 0.5), 0.1);
    assert.equal(readPercent(0.1, 0.1, 0.05, 0.5), 0.1);
    assert.equal(readPercent("", 0.1, 0.05, 0.5), 0.1);
    assert.equal(readPercent(80, 0.1, 0.05, 0.5), 0.5);
  });

  it("quotes Flex Buy from a posted delivered cash ticket without inventing", () => {
    const got = quoteFlexBuy({
      unitPrice: 1900,
      quantity: 1,
      deliveryPerUnit: 475,
      downPct: 10,
      months: 24,
    });
    assert.equal(got.ok, true);
    const q = got.quote;
    assert.equal(q.unitPrice, 1900);
    assert.equal(q.deliveryPerUnit, 475);
    assert.equal(q.financed, 1282.5);
    assert.equal(q.upfront, 617.5);
    const monthly = flexPmt(0.16 / 12, 24, 1282.5);
    assert.equal(q.monthly, Math.round(monthly * 100) / 100);
    assert.ok(q.monthly > 0);
    assert.ok(q.interest > 0);
    const missing = quoteFlexBuy({ unitPrice: 0, months: 24 });
    assert.equal(missing.ok, false);
    assert.match(missing.error, /posted CBSS cash price/);
  });

  it("puts delivery in the upfront on a pickup ticket as zero extra", () => {
    const got = quoteFlexBuy({
      unitPrice: 1425,
      quantity: 1,
      deliveryPerUnit: 0,
      downPct: 0.1,
      months: 12,
    });
    assert.equal(got.ok, true);
    assert.equal(got.quote.upfront, 142.5);
    assert.equal(got.quote.financed, 1282.5);
  });
});

describe("flex buy proposal submit", () => {
  it("writes Flex Buy fields onto a one-box client proposal", () => {
    const built = buildProposalSubmit({
      customerName: "Pat Lee",
      email: "pat@example.com",
      repName: "Kyle Hodgkiss",
      repEmail: "kyle@cbshippingsolutions.com",
      paymentMode: "flex",
      flexSelected: true,
      flexTermMonths: 24,
      flexDownPaymentPct: 10,
      lines: [line()],
    });
    assert.equal(built.ok, true);
    assert.equal(built.body.paymentMode, "flex");
    assert.equal(built.body.flexSelected, true);
    assert.equal(built.body.flexTermMonths, "24");
    assert.equal(built.body.flexApr, "0.16");
    assert.equal(built.body.flexAmountFinanced, "1282.50");
    assert.equal(built.body.flexUpfront, "617.50");
    assert.match(String(built.body.flexMonthlyPayment), /^\d+\.\d{2}$/);
    assert.equal(built.body.unitPrice, 1900);
    assert.doesNotMatch(JSON.stringify(built.body), /invent/i);
  });

  it("refuses Flex Buy when two cash options are on the ticket", () => {
    const built = buildProposalSubmit({
      customerName: "Pat Lee",
      repName: "Kyle",
      repEmail: "kyle@cbshippingsolutions.com",
      paymentMode: "flex",
      flexTermMonths: 24,
      lines: [line(), line({ grade: "OneTrip", wholesale: 1625, cash: 2800 })],
    });
    assert.equal(built.ok, false);
    assert.match(built.error, /one box/i);
  });

  it("keeps cash proposals without Flex fields when Flex is off", () => {
    const built = buildProposalSubmit({
      customerName: "Pat Lee",
      repName: "Kyle",
      repEmail: "kyle@cbshippingsolutions.com",
      paymentMode: "cash",
      lines: [line()],
    });
    assert.equal(built.ok, true);
    assert.equal(built.body.paymentMode, "cash");
    assert.equal(built.body.flexSelected, false);
    assert.equal(built.body.flexTermMonths, undefined);
  });

  it("reads a flex request from the Yard payload", () => {
    const got = readFlexBuyRequest({ paymentMode: "flex", flexTermMonths: "36", flexDownPaymentPct: "15" });
    assert.equal(got.selected, true);
    assert.equal(got.months, 36);
    assert.equal(got.downPct, 0.15);
    const fields = flexSubmitFields(quoteFlexBuy({ unitPrice: 1900, deliveryPerUnit: 475, months: 36 }).quote);
    assert.equal(fields.flexTermMonths, "36");
    assert.equal(fields.flexApr, "0.18");
  });
});

describe("Yard Flex Buy section writes a client proposal", () => {
  it("has its own Flex Buy section and submits flex fields", () => {
    assert.match(page, /id="p-flex"/);
    assert.match(page, /Flex Buy/);
    assert.match(page, /id="p-pay-flex"/);
    assert.match(page, /id="p-flex-table"/);
    assert.match(page, /id="p-flex-body"/);
    assert.match(page, /Do not invent a number/);
    assert.match(page, /flexSelected: payMode==="flex"/);
    assert.match(page, /flexTermMonths: flexPick && flexPick.months/);
    assert.match(index, /readFlexBuyRequest/);
    assert.match(index, /paymentMode: raw.paymentMode/);
  });
});
