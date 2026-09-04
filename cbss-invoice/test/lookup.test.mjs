import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agreedProposalAmount } from "../src/lookup.ts";

describe("agreed proposal amount", () => {
  it("returns the stored proposal cash and invents nothing", () => {
    const book = {
      contactsAdded: [{ id: 2558, name: "Woody Boyd", email: "wlboyd@gmail.com", phone: "9196129423" }],
      contacts: [],
      deals: [{ contactId: 2558, amount: 8275 }],
      proposals: { 2558: [{ amount: 8275, unitPrice: 8275 }] },
      contactEdits: {}
    };
    const hit = agreedProposalAmount(book, "wlboyd@gmail.com", "");
    assert.equal(hit.ok, true);
    assert.equal(hit.amount, 8275);
    assert.equal(hit.source, "proposal");
    const none = agreedProposalAmount(book, "nobody@example.com", "5551234");
    assert.equal(none.ok, false);
    assert.match(none.error, /No CRM contact/);
    const noCash = agreedProposalAmount({
      contactsAdded: [{ id: 9, name: "Pat", phone: "8703232593" }],
      contacts: [],
      deals: [],
      proposals: {},
      contactEdits: {}
    }, "", "8703232593");
    assert.equal(noCash.ok, false);
    assert.match(noCash.error, /no agreed cash/);
  });
});
