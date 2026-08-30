import { mkdirSync, writeFileSync } from "node:fs";
import { buildInvoiceDocument, renderInvoiceHtml } from "../src/document.ts";
import { EXISTING } from "../test/fixtures/existing-invoices.mjs";

const out = process.argv[2] || "/opt/cursor/artifacts/branded-invoices";
mkdirSync(out, { recursive: true });
for (const raw of EXISTING) {
  const doc = buildInvoiceDocument(raw);
  const html = renderInvoiceHtml(doc);
  const file = `${out}/${doc.number}.html`;
  writeFileSync(file, html);
  console.log(file, doc.total);
}
