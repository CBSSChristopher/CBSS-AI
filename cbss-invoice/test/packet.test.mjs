import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildInvoiceDocument, money } from "../src/document.ts";
import {
  LUFRAN_LINES,
  PALMER,
  buildPalmerCbssDocument,
  palmerCbssItems,
  renderPalmerPacketHtml,
} from "../src/packet.ts";

describe("Jamie Palmer Tema packet", () => {
  it("bills Jamie Palmer and keeps the agreed CBSS cash at $2,300", () => {
    const doc = buildPalmerCbssDocument();
    assert.equal(doc.billTo.name, "Jamie Palmer");
    assert.equal(doc.billTo.email, "jamiedpalmer@yahoo.com");
    assert.equal(doc.shipTo.name, "Load site · Williston, ND");
    assert.match(doc.shipTo.lines.join(" "), /15140 49 T Way NW/);
    assert.match(doc.shipTo.lines.join(" "), /Tema Port, Ghana/);
    assert.equal(doc.total, 2300);
    assert.equal(doc.warrantyKind, "export-soc");
    assert.match(palmerCbssItems()[1].title, /logistics and container handling/i);
    assert.equal(palmerCbssItems()[1].unit, 0);
  });

  it("encloses the confirmed Lufran quote, not the calculator dump", () => {
    const lufran = Math.round(LUFRAN_LINES.reduce((sum, row) => sum + row.qty * row.unit, 0) * 100) / 100;
    assert.equal(lufran, 7430.5);
    assert.equal(PALMER.lufranTotal, 7430.5);
    assert.equal(PALMER.lufranQuote, "1858440");
    const html = renderPalmerPacketHtml();
    assert.match(html, /Jamie Palmer/);
    assert.match(html, /CBS-2026-JP01/);
    assert.match(html, /QUOTE-1858440/);
    assert.match(html, /\$2,300\.00/);
    assert.match(html, /\$7,430\.50/);
    assert.match(html, /LUFRAN INTERNATIONAL/);
    assert.match(html, /paycargo\.com/);
    assert.match(html, /Export logistics and container handling/);
    assert.match(html, /#0B1F3A/);
    assert.match(html, /#C9A227/);
    assert.match(html, /How to Pay CBSS/);
    assert.match(html, /How to Pay Lufran/);
    assert.match(html, /DO NOT PAY THIS AMOUNT TO CB SHIPPING SOLUTIONS/);
    assert.doesNotMatch(html, /\$7,331\.50/);
    assert.doesNotMatch(html, /\$6,393\.00/);
    assert.doesNotMatch(html, /\$9,087\.51/);
    assert.doesNotMatch(html, /Nathaniel Owusu<\/strong>/);
    assert.equal(money(2300), "$2,300.00");
    const otherBill = buildInvoiceDocument({
      number: "CBS-2026-110",
      name: "Shawn Eastman",
      email: "info@eastmanexcavation.com",
      phone: "",
      billingLines: ["North Berwick, ME"],
      shippingLines: ["Boston, MA area"],
      items: [{ title: "test", qty: 1, unit: 10 }],
    });
    assert.equal(otherBill.billTo.name, "Shawn Eastman");
  });
});
