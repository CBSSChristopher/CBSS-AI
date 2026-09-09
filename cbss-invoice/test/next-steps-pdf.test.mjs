import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  NEXT_STEPS_PDF_NAME,
  decodePdfBase64,
  loadNextStepsPdf,
  loadNextStepsPdfBytes,
} from "../src/next-steps-pdf.ts";

const src = readFileSync(new URL("../src/next-steps-pdf.ts", import.meta.url), "utf8");
const markPaid = readFileSync(new URL("../src/mark-paid.ts", import.meta.url), "utf8");
const onDisk = readFileSync(new URL("../assets/CBSS-Next-Steps-After-Your-Order.pdf", import.meta.url));

describe("Next Steps PDF bundle", () => {
  it("loads the repo PDF as AgentMail content, never url", async () => {
    const att = await loadNextStepsPdf({ NEXT_STEPS_PDF_URL: "https://example.invalid/skip.pdf" });
    assert.ok(att);
    assert.equal(att.filename, NEXT_STEPS_PDF_NAME);
    assert.equal(att.content_type, "application/pdf");
    assert.equal(att.content_disposition, "attachment");
    assert.equal("url" in att, false);
    const bytes = decodePdfBase64(att.content);
    assert.deepEqual(Buffer.from(bytes), onDisk);
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
  });

  it("prefers ASSETS bytes over a leftover URL secret", async () => {
    const fake = new TextEncoder().encode("%PDF-1.4 asset-binding-bytes\n%%EOF\n");
    const env = {
      NEXT_STEPS_PDF_URL: "https://example.invalid/skip.pdf",
      ASSETS: {
        async fetch() {
          return new Response(fake, { status: 200, headers: { "Content-Type": "application/pdf" } });
        },
      },
    };
    const bytes = await loadNextStepsPdfBytes(env);
    assert.deepEqual(Buffer.from(bytes), Buffer.from(fake));
  });

  it("does not fetch NEXT_STEPS_PDF_URL anywhere in the loader or mark-paid send", () => {
    assert.doesNotMatch(src, /fetch\(url\)/);
    assert.match(src, /content_disposition: "attachment"/);
    assert.doesNotMatch(markPaid, /url:\s*pdfUrl/);
    assert.match(markPaid, /loadNextStepsPdf/);
  });
});
