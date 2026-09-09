import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  canSeeAllCrmOwners,
  ownerMatchesViewer,
  scopeCrmGetPayload,
  shouldScopeCrmGet,
} from "../src/crm-scope.ts";

const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

const jamesMail = ["james", "cbshippingsolutions.com"].join("@");
const chrisMail = ["christopher", "cbshippingsolutions.com"].join("@");

const book = {
  contacts: [
    { id: "1", name: "Pat", owner: "James" },
    { id: "2", name: "Sam", owner: "Christopher Banks" },
    { id: "3", name: "Lee", owner: jamesMail },
  ],
  contactsAdded: [{ id: "4", name: "New", owner: "James" }],
  deals: [
    { id: "d1", contactId: "1", owner: "James", stage: "Quote" },
    { id: "d2", contactId: "2", owner: "Christopher Banks", stage: "Sold" },
  ],
  followups: { "1": { nextAction: "Call" }, "2": { nextAction: "Skip" } },
  contactEdits: { "1": { city: "Jonesboro" }, "2": { city: "Little Rock" } },
  completedTasks: { "1": [{ text: "Done" }], "2": [{ text: "Other" }] },
};

describe("CRM GET owner scope", () => {
  it("scopes GET /crm-data action=get only", () => {
    assert.equal(shouldScopeCrmGet("/crm-data", "?action=get&omitNotes=1", "GET"), true);
    assert.equal(shouldScopeCrmGet("/crm-data", "", "GET"), true);
    assert.equal(shouldScopeCrmGet("/crm-data", "?action=getNotes", "GET"), false);
    assert.equal(shouldScopeCrmGet("/crm-data", "?action=get", "POST"), false);
    assert.equal(shouldScopeCrmGet("/other", "?action=get", "GET"), false);
  });

  it("Christopher sees every owner; other reps do not", () => {
    assert.equal(canSeeAllCrmOwners(chrisMail, "Christopher Banks"), true);
    assert.equal(canSeeAllCrmOwners(jamesMail, "James"), false);
    assert.equal(ownerMatchesViewer("James", "James", jamesMail), true);
    assert.equal(ownerMatchesViewer(jamesMail, "James", jamesMail), true);
    assert.equal(ownerMatchesViewer("Christopher Banks", "James", jamesMail), false);
  });

  it("filters contacts, deals, followups, edits, and completed for a rep", () => {
    const james = scopeCrmGetPayload(book, { email: jamesMail, name: "James" });
    assert.equal(james.scoped, true);
    assert.deepEqual(james.contacts.map((c) => c.id), ["1", "3"]);
    assert.deepEqual(james.contactsAdded.map((c) => c.id), ["4"]);
    assert.deepEqual(james.deals.map((d) => d.id), ["d1"]);
    assert.ok(james.followups["1"]);
    assert.equal(james.followups["2"], undefined);
    assert.ok(james.contactEdits["1"]);
    assert.equal(james.contactEdits["2"], undefined);
    assert.ok(james.completedTasks["1"]);
    assert.equal(james.completedTasks["2"], undefined);
  });

  it("does not filter Christopher's GET", () => {
    const chris = scopeCrmGetPayload(book, { email: chrisMail, name: "Christopher Banks" });
    assert.equal(chris.scoped, false);
    assert.equal(chris.contacts.length, 3);
    assert.equal(chris.deals.length, 2);
    assert.ok(chris.followups["2"]);
  });

  it("applies the filter on the worker after a live CRM GET", () => {
    assert.match(index, /scopeCrmGetPayload/);
    assert.match(index, /shouldScopeCrmGet/);
  });
});
