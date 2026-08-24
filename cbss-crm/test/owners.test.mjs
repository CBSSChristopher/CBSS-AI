import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeOwner,
  mergeContactsAdded,
  restoreMissingContacts,
  healPortedBook
} from "../src/owners.js";

test("canonicalizeOwner folds company email and local-part aliases onto one staff name", () => {
  assert.equal(canonicalizeOwner("james@cbshippingsolutions.com"), "James");
  assert.equal(canonicalizeOwner("James@cbshippingsolutions.com"), "James");
  assert.equal(canonicalizeOwner("james"), "James");
  assert.equal(canonicalizeOwner("James"), "James");
  assert.equal(canonicalizeOwner("matthew"), "Matthew Brent");
  assert.equal(canonicalizeOwner("Bryan Reese"), "Bryan Reese");
  assert.equal(canonicalizeOwner("Contact Owner"), "");
  assert.equal(canonicalizeOwner("Kristin Chapin"), "Kristin Chapin");
});

test("mergeContactsAdded keeps existing ported rows when a later desk save is a shorter list", () => {
  const current = [
    { id: 11, name: "Mark Trujillo", owner: "James" },
    { id: 22, name: "Chesty Chesterson", owner: "matthew" }
  ];
  const incoming = [{ id: 22, name: "Chesty Chesterson", owner: "matthew" }];
  const merged = mergeContactsAdded(current, incoming);
  assert.equal(merged.length, 2);
  assert.equal(merged.some((c) => String(c.id) === "11"), true);
  assert.equal(merged[0].id, 22);
});

test("restoreMissingContacts rebuilds wiped contacts from the deal and leftover edit only", () => {
  const added = restoreMissingContacts(
    [],
    [],
    [{ contactId: 1787318748534, contactName: "Mark Mcgary", name: "Mark Mcgary - Container", owner: "James@cbshippingsolutions.com", stage: "Quote" }],
    {
      "1787318748534": { name: "Mark Mcgary", email: "mark.m@pacificfs.net", phone: "3602240890", owner: "James", source: "Quote Form" }
    },
    {},
    {},
    {}
  );
  assert.equal(added.length, 1);
  assert.equal(added[0].name, "Mark Mcgary");
  assert.equal(added[0].email, "mark.m@pacificfs.net");
  assert.equal(added[0].owner, "James");
  assert.equal(added[0].source, "Quote Form");
});

test("healPortedBook does not invent a contact for the protected notes key", () => {
  const state = {
    contactsAdded: [],
    deals: [],
    contactEdits: {},
    notes: { 2621: [{ text: "keep" }] },
    followups: {},
    proposals: {}
  };
  healPortedBook(state, []);
  assert.equal(state.contactsAdded.some((c) => String(c.id) === "2621"), false);
});
