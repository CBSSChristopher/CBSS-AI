import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { canonicalizeOwner, resolveSessionOwner } from "../src/owners.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const crmSrc = readFileSync(new URL("../src/crm.ts", import.meta.url), "utf8");
const companyHost = ["cbshipping", "solutions.com"].join("");
const mail = (local) => `${local}@${companyHost}`;

function phoneDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function findExistingContact(book, input) {
  const phone = phoneDigits(String(input.phone || ""));
  const email = String(input.email || "").trim().toLowerCase();
  const all = [...(book.contactsAdded || []), ...(book.contacts || [])];
  if (phone && phone.length >= 10) {
    const hit = all.find((c) => phoneDigits(String(c.phone || "")) === phone);
    if (hit) return hit;
  }
  if (email) {
    const hit = all.find((c) => String(c.email || "").trim().toLowerCase() === email);
    if (hit) return hit;
  }
  return null;
}

function ownerMatchesSession(owner, email, name) {
  const raw = String(owner || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const e = String(email || "").trim().toLowerCase();
  if (e && (lower === e || lower.includes(e))) return true;
  const titled = canonicalizeOwner(raw).toLowerCase();
  const session = canonicalizeOwner(name || email).toLowerCase();
  return Boolean(titled && session && titled === session);
}

function findReusableContact(book, input, email, name) {
  const hit = findExistingContact(book, input);
  if (!hit) return null;
  if (ownerMatchesSession(String(hit.owner || ""), email, name)) return hit;
  return null;
}

describe("Desk owner + new contact port", () => {
  it("folds James company email and local-part onto James", () => {
    assert.equal(canonicalizeOwner(mail("james")), "James");
    assert.equal(canonicalizeOwner(mail("James")), "James");
    assert.equal(canonicalizeOwner("james"), "James");
    assert.equal(resolveSessionOwner(mail("James"), mail("james")), "James");
    assert.equal(resolveSessionOwner("james", mail("james")), "James");
  });

  it("does not attach an explicit new contact to someone else's archive row", () => {
    const book = {
      contacts: [
        { id: 99, name: "Pat Archive", phone: "5551112222", email: "pat@example.com", owner: "Christopher Banks" },
      ],
      contactsAdded: [],
    };
    const draft = { name: "Pat New", phone: "5551112222", email: "pat@example.com" };
    assert.equal(findExistingContact(book, draft)?.id, 99);
    assert.equal(findReusableContact(book, draft, mail("james"), "James"), null);
    assert.equal(findReusableContact(book, draft, mail("christopher"), "Christopher Banks")?.id, 99);
  });

  it("reuses a contact James already owns", () => {
    const book = {
      contacts: [],
      contactsAdded: [
        { id: 77, name: "Robin Davis Hewitt", phone: "9035550100", email: "robin@example.com", owner: "James" },
      ],
    };
    const hit = findReusableContact(
      book,
      { name: "Robin", phone: "9035550100", email: "robin@example.com" },
      mail("james"),
      mail("James"),
    );
    assert.equal(hit?.id, 77);
  });

  it("wires New contact to a real CRM create without requiring scraps", () => {
    assert.match(page, /id="new-save"/);
    assert.match(page, /Save contact to CRM/);
    assert.match(page, /\/contact\/create/);
    assert.match(page, /build 13/);
    assert.match(index, /path === "\/contact\/create"/);
    assert.match(index, /portCreatedContact/);
    assert.match(index, /findReusableContact/);
    assert.match(index, /if \(!scraps && pickedExisting\)/);
    assert.match(crmSrc, /function findReusableContact/);
    assert.match(crmSrc, /resolveSessionOwner\(input\.owner\)/);
    assert.doesNotMatch(index, /if \(!scraps\) return json\(400, \{ error: "Feed the call scraps first\." \}\)/);
  });
});
