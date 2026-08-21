import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/veem.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/auth.ts", import.meta.url), "utf8");

function parseAmount(raw) {
  const clean = String(raw || "").replace(/[$,\s]/g, "");
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100) / 100;
  if (cents < 50 || cents > 100000) return null;
  return cents;
}
function parsePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}
function splitName(raw) {
  const parts = String(raw || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
function completeDraft(raw) {
  const fromName = raw.name ? splitName(raw.name) : { firstName: "", lastName: "" };
  const firstName = String(raw.firstName || fromName.firstName || "").trim();
  const lastName = String(raw.lastName || fromName.lastName || "").trim();
  const email = String(raw.email || "").trim().toLowerCase();
  const phone = parsePhone(String(raw.phone || ""));
  const amount = typeof raw.amount === "number" ? raw.amount : parseAmount(String(raw.amountRaw || ""));
  const notes = String(raw.notes || "").trim().slice(0, 128);
  const city = String(raw.city || "").trim();
  const state = String(raw.state || "").trim().toUpperCase();
  const zip = String(raw.zip || "").replace(/\D/g, "").slice(0, 5);
  const street = String(raw.street || "").trim();
  if (!firstName || !lastName) return { error: "Type the customer first and last name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Type the customer email." };
  if (phone.length !== 10) return { error: "Type a 10-digit US phone." };
  if (amount == null) return { error: "Type the exact dollar amount Christopher set. Do not invent one." };
  if (!notes) return { error: "Type what this payment is for." };
  if (!city || !/^[A-Z]{2}$/.test(state) || zip.length !== 5) return { error: "Type city, two-letter state, and ZIP." };
  return { firstName, lastName, email, phone, amount, notes, city, state, zip, street: street || "Delivery site" };
}
function parseInvoice(raw) {
  if (!raw || typeof raw !== "object") return null;
  const amount = Number(raw.amount?.number);
  if (!Number.isFinite(amount) || amount < 50) return null;
  return {
    id: Number(raw.id) || null,
    status: String(raw.status || "Sent"),
    amount,
    currency: String(raw.amount?.currency || "USD"),
    email: String(raw.payer?.email || ""),
    name: [raw.payer?.firstName, raw.payer?.lastName].filter(Boolean).join(" "),
    notes: String(raw.notes || ""),
    claimLink: String(raw.claimLink || ""),
    timeCreated: String(raw.timeCreated || ""),
  };
}
function formatPaymentCard(card) {
  return [
    "VEEM PAYMENT REQUEST — not a CBSS quote",
    `${card.name}  ${card.email}  $${card.amount.toFixed(2)} ${card.currency}  ${card.status}`,
    card.notes,
    `Pay link: ${card.claimLink}`,
  ].join("\n");
}

describe("CBSS Pay · Veem", () => {
  it("uses Veem public invoice API and company-email login", () => {
    assert.match(src, /\/oauth\/token/);
    assert.match(src, /\/veem\/v1\.2\/invoices/);
    assert.match(src, /client_credentials/);
    assert.match(src, /claimLink/);
    assert.match(src, /Do not invent one/);
    assert.match(auth, /COMPANY_RE/);
    assert.match(auth, /Use your company email/);
    assert.match(auth, /cbsscrm\.cbss\.workers\.dev\/auth\/login/);
    assert.match(index, /\/pay\/create/);
    assert.match(index, /\/pay\/list/);
    assert.match(index, /\/pay\/cancel/);
    assert.match(page, /Create Veem request/);
    assert.match(page, /build 2/);
    assert.match(page, /veem-warn/);
    assert.match(src, /restricted and cannot generate API tokens/);
    assert.doesNotMatch(src, /xChange/);
  });

  it("takes only a typed amount and a complete customer", () => {
    assert.equal(parseAmount(""), null);
    assert.equal(parseAmount("ask christopher"), null);
    assert.equal(parseAmount("$3,990.00"), 3990);
    assert.equal(completeDraft({ name: "Gary", email: "gary@test.com", phone: "8703232593", amountRaw: "3990", notes: "40HC", city: "Jonesboro", state: "AR", zip: "72401" }).error, "Type the customer first and last name.");
    const ok = completeDraft({
      name: "Gary Smith",
      email: "gary@test.com",
      phone: "1-870-323-2593",
      amountRaw: "$3,990",
      notes: "40HC CW delivered",
      city: "Jonesboro",
      state: "ar",
      zip: "72401",
    });
    assert.equal(ok.firstName, "Gary");
    assert.equal(ok.lastName, "Smith");
    assert.equal(ok.phone, "8703232593");
    assert.equal(ok.amount, 3990);
    assert.equal(ok.state, "AR");
  });

  it("posts the Veem pay link as their request, not our quote", () => {
    const card = parseInvoice({
      id: 159776,
      status: "Sent",
      notes: "40HC CW delivered",
      amount: { number: 3990, currency: "USD" },
      payer: { firstName: "Gary", lastName: "Smith", email: "gary@test.com" },
      claimLink: "https://apps.veem.com/pay/159776",
    });
    assert.ok(card);
    const text = formatPaymentCard(card);
    assert.match(text, /VEEM PAYMENT REQUEST — not a CBSS quote/);
    assert.match(text, /\$3990\.00/);
    assert.match(text, /https:\/\/apps\.veem\.com\/pay\/159776/);
    assert.equal(parseInvoice({ amount: { number: 10 } }), null);
  });

  it("maps a restricted Veem account instead of blaming the keys", () => {
    const raw = JSON.stringify({
      error: "server_error",
      error_description: "Account is Restricted, cannot generate tokens.",
    });
    function tokenError(text) {
      const parsed = JSON.parse(text);
      const desc = String(parsed.error_description || parsed.error || "");
      if (/restricted/i.test(desc) || /cannot generate tokens/i.test(desc)) {
        return "Veem says this account is restricted and cannot generate API tokens. Ask Veem support to enable API access on the CBGC LLC account.";
      }
      return desc;
    }
    assert.match(tokenError(raw), /restricted and cannot generate API tokens/);
  });
});
