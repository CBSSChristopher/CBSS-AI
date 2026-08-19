import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/brain.ts", import.meta.url), "utf8");
const PRICE_RE = /\$\s*\d|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:dollars|usd)?\b|\b\d{3,5}\s*(?:dollars|usd)\b/i;

function containsQuotedPrice(text) {
  return PRICE_RE.test(String(text || ""));
}

function sanitizeReply(text) {
  const raw = String(text || "").trim();
  if (!raw) return "Ask me how we sell, what to put in the CRM, or when to text Christopher.";
  if (containsQuotedPrice(raw)) {
    return "I cannot give a price or a guess. Get their name, phone, email, ZIP, size, and what they want. Put it in the CRM. Text Christopher at 870-323-2593.";
  }
  return raw;
}

describe("CBSS Brain rules", () => {
  it("bakes in no-price and Christopher-closes rules", () => {
    assert.match(src, /Do not give a delivered price/);
    assert.match(src, /Christopher closes/);
    assert.match(src, /No COD/);
    assert.doesNotMatch(src, /xChange|Phoenix depot|\$725|\$600/);
  });

  it("blocks dollar quotes and allows phones", () => {
    assert.equal(containsQuotedPrice("The 40HC is $3,775 delivered"), true);
    assert.equal(containsQuotedPrice("about 3775 dollars"), true);
    assert.equal(containsQuotedPrice("Text Christopher at 870-323-2593"), false);
    assert.match(sanitizeReply("I would charge $3990"), /cannot give a price/);
    assert.equal(sanitizeReply("Put the ZIP in the CRM."), "Put the ZIP in the CRM.");
  });
});
