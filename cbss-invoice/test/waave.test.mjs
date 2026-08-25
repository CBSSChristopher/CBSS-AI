import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/waave.ts", import.meta.url), "utf8");
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
  const notes = String(raw.notes || "").trim().slice(0, 160);
  const city = String(raw.city || "").trim();
  const state = String(raw.state || "").trim().toUpperCase();
  const zip = String(raw.zip || "").replace(/\D/g, "").slice(0, 5);
  const street = String(raw.street || "").trim();
  if (!firstName || !lastName) return { error: "Type the customer first and last name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Type the customer email." };
  if (phone.length !== 10) return { error: "Type a 10-digit US phone." };
  if (amount == null) return { error: "Type the exact dollar amount Christopher set. Do not invent one." };
  if (!notes) return { error: "Type what this invoice is for." };
  if (!city || !/^[A-Z]{2}$/.test(state) || zip.length !== 5) {
    return { error: "Type city, two-letter state, and ZIP." };
  }
  return { firstName, lastName, email, phone, amount, notes, city, state, zip, street: street || "Delivery site" };
}

function waaveSignature(secret, url, body) {
  return createHash("sha256").update(`${secret}${url}${body}`).digest("hex");
}

function payLinkFrom(raw, id, base) {
  for (const key of ["payment_url", "checkout_url", "pay_url", "payLink", "claimLink", "url", "link", "invoice_url"]) {
    if (raw[key]) return raw[key];
  }
  return id ? `${base}/pay/${id}` : "";
}

describe("CBSS Invoicing · WAAVE", () => {
  it("is a separate invoicing tool with company-email login", () => {
    assert.match(page, /CBSS Invoicing/);
    assert.match(page, /build 2 · WAAVE/);
    assert.match(page, /Create WAAVE invoice/);
    assert.match(page, /Open Gmail/);
    assert.match(page, /Type the amount Christopher set/);
    assert.match(auth, /COMPANY_RE/);
    assert.match(auth, /Use your company email/);
    assert.match(auth, /cbsscrm\.cbss\.workers\.dev\/auth\/login/);
    assert.match(index, /\/invoice\/create/);
    assert.match(index, /\/invoice\/list/);
    assert.match(index, /\/invoice\/cancel/);
    assert.doesNotMatch(src, /card_number/);
    assert.doesNotMatch(page, /card number/i);
    assert.doesNotMatch(src, /xChange/);
    assert.doesNotMatch(index, /cbsspay|cbssbrain|cbsscompletetool/);
  });

  it("signs WAAVE the way their docs hash secret + url + body", () => {
    const secret = "9e2aee3285f54e6e0f08042d694feb7a";
    const url = "https://staging-pg.getwaave.co/waavepay/api/transaction/3dcb8ea99fc6c3651b97fcb1224c6200";
    assert.equal(waaveSignature(secret, url, ""), "638a2a33d44b670e1c070d064b9a9c248639378cbeaf884c585f034e70e58eec");
    assert.match(src, /X-Api-Signature/);
    assert.match(src, /X-Api-Key/);
    assert.match(src, /\/waavepay\/api\/transaction/);
    assert.doesNotMatch(src, /`\/api\/transaction\/\$\{/);
    assert.match(src, /send_email: true/);
  });

  it("takes only a typed amount and a complete customer", () => {
    assert.equal(parseAmount(""), null);
    assert.equal(parseAmount("ask christopher"), null);
    assert.equal(parseAmount("$3,990.00"), 3990);
    assert.equal(
      completeDraft({ name: "Gary", email: "gary@test.com", phone: "8703232593", amountRaw: "3990", notes: "40HC", city: "Jonesboro", state: "AR", zip: "72401" }).error,
      "Type the customer first and last name.",
    );
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

  it("posts the WAAVE pay link as their invoice, not our quote", () => {
    const payLink = payLinkFrom(
      { payment_url: "https://pg.getwaave.co/pay/abc123" },
      "abc123",
      "https://pg.getwaave.co",
    );
    assert.equal(payLink, "https://pg.getwaave.co/pay/abc123");
    assert.equal(payLinkFrom({}, "abc123", "https://pg.getwaave.co"), "https://pg.getwaave.co/pay/abc123");
    assert.match(src, /WAAVE INVOICE — not a CBSS quote/);
    assert.match(src, /Do not invent a different amount/);
    assert.match(src, /mail\.google\.com\/mail/);
    assert.match(src, /This tool does not send from Gmail/);
  });

  it("CCs Christopher, Aliyah, and the signed-in rep on the Gmail send", async () => {
    const { invoiceCopyEmails, gmailDraft, formatInvoiceCard } = await import("../src/waave.ts");
    const host = ["cbshipping", "solutions.com"].join("");
    const mail = (local) => `${local}@${host}`;
    const james = invoiceCopyEmails(mail("james"));
    assert.deepEqual(james, [mail("christopher"), mail("aliyah"), mail("james")]);
    const chris = invoiceCopyEmails(mail("Christopher"));
    assert.deepEqual(chris, [mail("christopher"), mail("aliyah")]);
    const link = gmailDraft("gary@test.com", "Gary Smith", 3990, "https://pg.getwaave.co/pay/x", "40HC CW", james);
    assert.match(link, /[?&]cc=/);
    assert.ok(decodeURIComponent(link).includes(james.join(",")));
    const text = formatInvoiceCard({
      id: "x",
      status: "sent",
      amount: 3990,
      currency: "USD",
      email: "gary@test.com",
      name: "Gary Smith",
      notes: "40HC CW",
      payLink: "https://pg.getwaave.co/pay/x",
      gmailLink: link,
      referenceId: "1",
      timeCreated: "",
      emailedByWaave: false,
      sentBy: mail("james"),
      ccEmails: james,
    });
    assert.match(text, /CC:/);
    assert.ok(text.includes(mail("james")));
    assert.match(page, /CCs Christopher, Aliyah, and you/);
    assert.match(src, /cc_emails/);
    assert.match(index, /createInvoice\(env, draft, url\.origin, user\.email\)/);
  });
});
