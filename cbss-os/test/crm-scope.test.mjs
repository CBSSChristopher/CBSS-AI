import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  applyOwnerEdits,
  canSeeAllCrmOwners,
  claimAssignedOwner,
  effectiveOwner,
  isUnassignedPool,
  ownerMatchesViewer,
  ownerVisibleToViewer,
  scopeCrmGetPayload,
  shouldScopeCrmGet,
} from "../src/crm-scope.ts";

const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");

const jamesMail = ["james", "cbshippingsolutions.com"].join("@");
const chrisMail = ["christopher", "cbshippingsolutions.com"].join("@");

const book = {
  contacts: [
    { id: "1", name: "Pat", owner: "James" },
    { id: "2", name: "Sam", owner: "Christopher Banks" },
    { id: "3", name: "Lee", owner: jamesMail },
    { id: "5", name: "Facebook Lead", owner: "New/Unassigned" },
    { id: "6", name: "Blank Owner", owner: "" },
  ],
  contactsAdded: [
    { id: "4", name: "New", owner: "James" },
    { id: "7", name: "Julia pile", owner: "New/Unassigned" },
  ],
  deals: [
    { id: "d1", contactId: "1", owner: "James", stage: "Quote" },
    { id: "d2", contactId: "2", owner: "Christopher Banks", stage: "Sold" },
  ],
  followups: { "1": { nextAction: "Call" }, "2": { nextAction: "Skip" } },
  contactEdits: { "1": { city: "Jonesboro" }, "2": { city: "Little Rock" } },
  completedTasks: { "1": [{ text: "Done" }], "2": [{ text: "Other" }] },
  proposals: { "1": [{ amount: 4200, status: "sent" }], "2": [{ amount: 9900, status: "sent" }] },
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
    assert.deepEqual(james.contacts.map((c) => c.id), ["1", "3", "5", "6"]);
    assert.deepEqual(james.contactsAdded.map((c) => c.id), ["4", "7"]);
    assert.deepEqual(james.deals.map((d) => d.id), ["d1"]);
    assert.ok(james.followups["1"]);
    assert.equal(james.followups["2"], undefined);
    assert.ok(james.contactEdits["1"]);
    assert.equal(james.contactEdits["2"], undefined);
    assert.ok(james.completedTasks["1"]);
    assert.equal(james.completedTasks["2"], undefined);
    assert.ok(james.proposals["1"]);
    assert.equal(james.proposals["2"], undefined);
  });

  it("lets Julia see New/Unassigned without Christopher or James books", () => {
    assert.equal(isUnassignedPool("New/Unassigned"), true);
    assert.equal(isUnassignedPool("unassigned"), true);
    assert.equal(isUnassignedPool(""), true);
    assert.equal(isUnassignedPool("James"), false);
    const juliaMail = ["julia", "cbshippingsolutions.com"].join("@");
    assert.equal(ownerVisibleToViewer("New/Unassigned", "Julia", juliaMail), true);
    assert.equal(ownerVisibleToViewer("James", "Julia", juliaMail), false);
    const julia = scopeCrmGetPayload(book, { email: juliaMail, name: "Julia" });
    assert.equal(julia.scoped, true);
    assert.deepEqual(julia.contacts.map((c) => c.id), ["5", "6"]);
    assert.deepEqual(julia.contactsAdded.map((c) => c.id), ["7"]);
    assert.deepEqual(julia.deals.map((d) => d.id), []);
    assert.equal(julia.followups["1"], undefined);
    assert.equal(julia.followups["2"], undefined);
    assert.equal(julia.proposals["1"], undefined);
    assert.equal(julia.proposals["2"], undefined);
  });

  it("does not filter Christopher's GET", () => {
    const chris = scopeCrmGetPayload(book, { email: chrisMail, name: "Christopher Banks" });
    assert.equal(chris.scoped, false);
    assert.equal(chris.contacts.length, 5);
    assert.equal(chris.contactsAdded.length, 2);
    assert.equal(chris.deals.length, 2);
    assert.ok(chris.followups["2"]);
  });

  it("applies the filter on the worker after a live CRM GET", () => {
    assert.match(index, /scopeCrmGetPayload/);
    assert.match(index, /shouldScopeCrmGet/);
    assert.match(page, /No names in this book/);
    assert.match(page, /left New\/Unassigned/);
    assert.match(page, /claimAssignedOnBook/);
    assert.match(page, /saveContactsAdded/);
  });

  it("takes contactEdits.owner over the raw New/Unassigned stamp", () => {
    const assigned = {
      ...book,
      contactEdits: {
        ...book.contactEdits,
        "5": { owner: "James" },
        "7": { owner: "Julia" },
      },
    };
    assert.equal(effectiveOwner({ id: "5", owner: "New/Unassigned" }, assigned.contactEdits), "James");
    const james = scopeCrmGetPayload(assigned, { email: jamesMail, name: "James" });
    assert.equal(james.contacts.find((c) => c.id === "5").owner, "James");
    assert.equal(james.contactsAdded.find((c) => c.id === "7"), undefined);
    const juliaMail = ["julia", "cbshippingsolutions.com"].join("@");
    const julia = scopeCrmGetPayload(assigned, { email: juliaMail, name: "Julia" });
    assert.deepEqual(julia.contacts.map((c) => c.id), ["6"]);
    assert.deepEqual(julia.contactsAdded.map((c) => c.id), ["7"]);
    assert.equal(julia.contactsAdded[0].owner, "Julia");
  });

  it("pulls an unassigned Facebook twin onto the assigned owner", () => {
    const raw = {
      contacts: [{ id: "10", name: "Chuck Galavich", owner: "Christopher Banks", phone: "8705550100" }],
      contactsAdded: [{ id: "11", name: "Chuck Galavich", owner: "New/Unassigned", phone: "(870) 555-0100", source: "Facebook" }],
      contactEdits: {},
    };
    assert.equal(
      claimAssignedOwner(raw.contactsAdded[0], raw.contacts),
      "Christopher Banks",
    );
    const owned = applyOwnerEdits(raw);
    assert.equal(owned.contactsAdded[0].owner, "Christopher Banks");
    const juliaMail = ["julia", "cbshippingsolutions.com"].join("@");
    const julia = scopeCrmGetPayload(raw, { email: juliaMail, name: "Julia" });
    assert.equal(julia.contactsAdded.length, 0);
    const chris = scopeCrmGetPayload(raw, { email: chrisMail, name: "Christopher Banks" });
    assert.equal(chris.contactsAdded[0].owner, "Christopher Banks");
    assert.equal(isUnassignedPool(chris.contactsAdded[0].owner), false);
  });
});
