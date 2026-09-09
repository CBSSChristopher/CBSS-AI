import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  NEXT_STEPS_PDF_NAME,
  decodePdfBase64,
  loadNextStepsPdf,
  loadNextStepsPdfBytes,
} from "../src/next-steps-pdf.ts";

const src = readFileSync(new URL("../src/next-steps-pdf.ts", import.meta.url), "utf8");
const markPaid = readFileSync(new URL("../src/mark-paid.ts", import.meta.url), "utf8");
const assetUrl = new URL("../assets/CBSS-Next-Steps-After-Your-Order.pdf", import.meta.url);

function assetsEnv(bytes, extra = {}) {
  return {
    NEXT_STEPS_PDF_URL: "https://example.invalid/skip.pdf",
    ASSETS: {
      async fetch() {
        return new Response(bytes, { status: 200, headers: { "Content-Type": "application/pdf" } });
      },
    },
    ...extra,
  };
}

describe("Next Steps PDF bundle", () => {
  it("returns no attachment when the canonical binary is missing — does not invent or use a URL", async () => {
    if (existsSync(assetUrl)) return;
    const att = await loadNextStepsPdf({ NEXT_STEPS_PDF_URL: "https://example.invalid/skip.pdf" });
    assert.equal(att, null);
  });

  it("when the repo asset exists it must be the real ~1.36MB binary", () => {
    if (!existsSync(assetUrl)) return;
    const st = statSync(assetUrl);
    assert.ok(st.size > 1_000_000, `canonical PDF must be ~1.36MB, got ${st.size} bytes`);
    const head = readFileSync(assetUrl).subarray(0, 5).toString();
    assert.equal(head, "%PDF-");
  });

  it("loads ASSETS bytes as AgentMail content, never url", async () => {
    const fake = new TextEncoder().encode("%PDF-1.4 asset-binding-bytes\n%%EOF\n");
    const att = await loadNextStepsPdf(assetsEnv(fake));
    assert.ok(att);
    assert.equal(att.filename, NEXT_STEPS_PDF_NAME);
    assert.equal(att.content_type, "application/pdf");
    assert.equal(att.content_disposition, "attachment");
    assert.equal("url" in att, false);
    assert.deepEqual(Buffer.from(decodePdfBase64(att.content)), Buffer.from(fake));
  });

  it("prefers ASSETS bytes over a leftover URL secret", async () => {
    const fake = new TextEncoder().encode("%PDF-1.4 asset-binding-bytes\n%%EOF\n");
    const bytes = await loadNextStepsPdfBytes(assetsEnv(fake));
    assert.deepEqual(Buffer.from(bytes), Buffer.from(fake));
  });

  it("does not fetch NEXT_STEPS_PDF_URL anywhere in the loader or mark-paid send", () => {
    assert.doesNotMatch(src, /fetch\(url\)/);
    assert.doesNotMatch(src, /renderNextStepsPdf/);
    assert.match(src, /content_disposition: "attachment"/);
    assert.doesNotMatch(markPaid, /url:\s*pdfUrl/);
    assert.match(markPaid, /loadNextStepsPdf/);
  });
});
