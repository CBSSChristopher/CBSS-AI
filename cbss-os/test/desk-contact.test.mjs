import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildDeskAddedContact,
  deskContactName,
  findOwnDeskContact,
  phoneDigits,
  readDeskContactDraft,
} from "../src/desk-contact.ts";
import { pageHtml } from "../src/page.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("Desk new contact on The Yard", () => {
  it("builds first and last name plus address fields", () => {
    const draft = readDeskContactDraft({
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "(870) 555-0100",
      company: "Lee Farms",
      city: "Jonesboro",
      state: "AR",
      zip: "72401",
      address: "14 Depot Rd",
      notes: "Called about a 40HC. Do not invent a price.",
    });
    assert.equal(deskContactName(draft), "Pat Lee");
    assert.equal(draft.street, "14 Depot Rd");
    assert.equal(draft.company, "Lee Farms");
    const row = buildDeskAddedContact(draft, "kyle@cbshippingsolutions.com", new Date("2026-09-01T12:00:00Z"));
    assert.equal(row.name, "Pat Lee");
    assert.equal(row.owner, "Kyle Hodgkiss");
    assert.equal(row.status, "New Lead");
    assert.equal(row.source, "Desk");
    assert.equal(row.street, "14 Depot Rd");
    assert.equal(row.created, "2026-09-01");
  });

  it("reuses the signed-in rep's matching phone and not someone else's", () => {
    const draft = readDeskContactDraft({ firstName: "Pat", lastName: "Lee", phone: "8705550100" });
    const mine = { id: 1, name: "Pat Lee", phone: "870-555-0100", owner: "Kyle" };
    const other = { id: 2, name: "Pat Lee", phone: "870-555-0100", owner: "James" };
    assert.equal(phoneDigits("870-555-0100"), "8705550100");
    assert.equal(findOwnDeskContact([other], draft, "Kyle Hodgkiss"), null);
    assert.equal(findOwnDeskContact([other, mine], draft, "Kyle Hodgkiss"), mine);
  });

  it("puts the New contact form on Desk and writes through /desk/contact", () => {
    assert.match(page, />New contact</);
    assert.match(page, /id="desk-new-open"/);
    assert.match(page, /id="desk-new"/);
    assert.match(page, /id="n-first"/);
    assert.match(page, /id="n-last"/);
    assert.match(page, /id="n-email"/);
    assert.match(page, /id="n-phone"/);
    assert.match(page, /id="n-company"/);
    assert.match(page, /id="n-street"/);
    assert.match(page, /id="n-city"/);
    assert.match(page, /id="n-state"/);
    assert.match(page, /id="n-zip"/);
    assert.match(page, /id="n-notes"/);
    assert.match(page, /id="n-save"/);
    assert.match(page, /Save to CRM/);
    assert.match(page, /api\("\/desk\/contact"/);
    assert.match(index, /path === "\/desk\/contact"/);
    assert.match(index, /saveContactsAdded/);
    assert.match(index, /appendNote/);
    assert.match(index, /Type first and last name/);
  });
});
