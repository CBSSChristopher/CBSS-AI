import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  BANK,
  BRAND,
  buildInvoiceDocument,
  cbsNumber,
  documentFromDraft,
  money,
  parseItems,
  renderInvoiceHtml,
  wireGross,
} from "../src/document.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const src = readFileSync(new URL("../src/waave.ts", import.meta.url), "utf8");

const eastman = buildInvoiceDocument({
  number: "CBS-2026-110",
  date: "August 28, 2026",
  banner: "20' WWT + 40' WWT · BOSTON, MA AREA · WEEKDAY DELIVERY INCLUDED",
  name: "Shawn Eastman",
  company: "Eastman's Excavation & Landscaping",
  email: "info@eastmanexcavation.com",
  phone: "2072525906",
  billingLines: ["North Berwick, ME 03906"],
  shippingLines: ["Boston, MA area (as quoted)", "Confirm street address and site access before dispatch."],
  items: [
    {
      title: "20' Standard Wind & Water Tight (WWT) shipping container",
      detail: "Delivered to the Boston, MA area. Standard weekday delivery included. Standard height (not high cube).",
      qty: 1,
      unit: 2825,
    },
    {
      title: "40' Standard Wind & Water Tight (WWT) shipping container",
      detail: "Delivered to the Boston, MA area. Standard weekday delivery included. Standard height (not high cube).",
      qty: 1,
      unit: 3150,
    },
  ],
  notes: [
    "Delivered cash prices from the client proposals: $2,825.00 for the 20' WWT and $3,150.00 for the 40' WWT. Standard weekday delivery is included — do not add a separate delivery line.",
    "Total of $5,975.00 for both units is due in full before dispatch.",
  ],
  remittance: "After you send payment, email remittance confirmation so we can schedule Boston-area delivery.",
});

describe("CBSS branded invoice document", () => {
  it("uses the navy / gold brand and Times + Helvetica stack", () => {
    const html = renderInvoiceHtml(eastman);
    assert.equal(BRAND.navy, "#0B1F3A");
    assert.equal(BRAND.gold, "#C9A227");
    assert.match(html, /#0B1F3A/);
    assert.match(html, /#C9A227/);
    assert.match(html, /Times New Roman/);
    assert.match(html, /Helvetica/);
    assert.match(html, />CB</);
    assert.match(html, /CB SHIPPING SOLUTIONS/);
    assert.match(html, /CBS-2026-110/);
    assert.match(html, /Shawn Eastman/);
    assert.match(html, /\$5,975\.00/);
    assert.match(html, /How to Pay/);
  });

  it("always prints ACH, domestic wire, and SWIFT on page 2", () => {
    const html = renderInvoiceHtml(eastman);
    assert.match(html, /ACH \/ E-CHECK/);
    assert.match(html, /101019644/);
    assert.match(html, /212719485341/);
    assert.match(html, /Lead Bank/);
    assert.match(html, /DOMESTIC WIRE/);
    assert.match(html, /Wire \$5,985\.00 to net \$5,975\.00/);
    assert.match(html, /REVOUS31/);
    assert.match(html, /CHASGB2L/);
    assert.match(html, /Page 2 of 2/);
    assert.equal(wireGross(5975), 5985);
    assert.equal(BANK.wireFee, 10);
    assert.equal(money(3080), "$3,080.00");
    assert.equal(cbsNumber(7), "CBS-2026-007");
  });

  it("is what the invoice tool generates going forward", () => {
    assert.match(page, /build 6 · branded invoice · ACH or card/);
    assert.match(page, /Invoice — ACH \/ wire only/);
    assert.match(page, /Invoice \+ card pay link/);
    assert.match(page, /navy\/gold CBSS invoice/);
    assert.match(page, /ACH, domestic wire, and SWIFT/);
    assert.match(index, /documentFromDraft/);
    assert.match(index, /\/invoice\/document\//);
    assert.match(index, /createInvoice\(env, draft, url\.origin, user\.email\)/);
    assert.match(src, /ACH, e-check, or wire/);
    assert.match(src, /page 2 of the invoice/);
    const items = parseItems([], "40HC CW delivered", 3990);
    assert.deepEqual(items, [{ title: "40HC CW delivered", qty: 1, unit: 3990 }]);
    const draftDoc = documentFromDraft(
      {
        firstName: "Gary",
        lastName: "Smith",
        email: "gary@test.com",
        phone: "8703232593",
        amount: 3990,
        notes: "40HC CW delivered",
        billing: { street: "100 Office Rd", city: "Jonesboro", state: "AR", zip: "72401" },
        delivery: { street: "400 Job Site", city: "Paragould", state: "AR", zip: "72450" },
      },
      { number: "CBS-2026-111" },
    );
    assert.equal(draftDoc.total, 3990);
    assert.match(renderInvoiceHtml(draftDoc), /Wire \$4,000\.00 to net \$3,990\.00/);
  });

  it("does not print the company name twice on Bill To / Ship To", () => {
    const html = renderInvoiceHtml(
      buildInvoiceDocument({
        number: "CBS-2026-107",
        date: "August 23, 2026",
        name: "Brent Snyder",
        company: "Trapper Creek LLC",
        email: "trappercreekllc@gmail.com",
        phone: "5859445826",
        billingLines: ["Trapper Creek LLC", "1315 Clinton St.", "Attica, NY"],
        shippingLines: ["Trapper Creek LLC", "10770 Bowen Rd.", "Attica, NY 14011"],
        items: [{ title: "40' WWT delivered", qty: 1, unit: 3080 }],
      }),
    );
    const bill = html.split("BILL TO")[1].split("SHIP TO")[0];
    assert.equal(bill.split("Trapper Creek LLC").length - 1, 1);
  });
});
