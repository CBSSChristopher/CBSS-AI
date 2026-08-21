import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/brain.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");

const PRICE_RE = /\$\s*\d|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:dollars|usd)?\b|\b\d{3,5}\s*(?:dollars|usd)\b/i;
const DOLLAR_RE = /\$\s*([\d,]+(?:\.\d{1,2})?)/g;
const WORDS_RE = /(\d{3,7})\s*(?:dollars|usd)\b/gi;

function containsQuotedPrice(text) {
  return PRICE_RE.test(String(text || ""));
}
function extractAmounts(text) {
  const found = new Set();
  const add = (raw) => {
    const n = Number(String(raw).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 50) return;
    found.add(n.toFixed(2));
    found.add(String(Math.round(n)));
  };
  for (const match of String(text || "").matchAll(DOLLAR_RE)) add(match[1] || "");
  for (const match of String(text || "").matchAll(WORDS_RE)) add(match[1] || "");
  return found;
}
function sanitizeReply(text, allowedSource = "") {
  const raw = String(text || "").trim();
  if (!raw) return "Tell me the lead or the job: CRM note, email, proposal, or call help.";
  if (!containsQuotedPrice(raw)) return raw;
  const allowed = extractAmounts(allowedSource);
  if (!allowed.size) return "I can only use a price Christopher or you typed.";
  for (const amt of extractAmounts(raw)) {
    if (!allowed.has(amt)) return "I can only use a price Christopher or you typed.";
  }
  return raw;
}

describe("CBSS Desk rules", () => {
  it("is a writing desk, not a send bot", () => {
    assert.match(src, /Never invent a price/);
    assert.match(src, /Christopher closes/);
    assert.match(src, /Draft only|never send/i);
    assert.match(src, /CRM NOTE FORMAT/);
    assert.match(src, /With thanks and my blessings/);
    assert.match(src, /Call writes the CRM note/);
    assert.match(page, /data-job="live">Call</);
    assert.match(page, /data-job="email">Email</);
    assert.match(page, /Custom draft or proposal wording/);
    assert.match(page, /company email/);
    assert.doesNotMatch(src, /xChange|Phoenix depot|\$725|\$600/);
  });

  it("allows only dollar amounts the rep already typed", () => {
    assert.equal(containsQuotedPrice("Text Christopher at 870-323-2593"), false);
    assert.match(sanitizeReply("Charge them $3990"), /only use a price/);
    assert.equal(
      sanitizeReply("1 × 40STD = $3,990.00 delivered", "Price set by Christopher: $3990"),
      "1 × 40STD = $3,990.00 delivered",
    );
    assert.match(sanitizeReply("Also add $725 freight", "Price set by Christopher: $3990"), /only use a price/);
  });
});
