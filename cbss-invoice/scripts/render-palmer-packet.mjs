import { mkdirSync, writeFileSync } from "node:fs";
import { buildPalmerCbssDocument, renderPalmerPacketHtml, PALMER } from "../src/packet.ts";

const out = process.argv[2] || "/opt/cursor/artifacts/jamie-palmer-packet";
mkdirSync(out, { recursive: true });
const doc = buildPalmerCbssDocument();
const html = renderPalmerPacketHtml();
writeFileSync(`${out}/CBSS-Jamie-Palmer-Tema-Packet.html`, html);
writeFileSync(
  `${out}/packet.json`,
  JSON.stringify(
    {
      billTo: PALMER.billTo.name,
      email: PALMER.billTo.email,
      cbssNumber: PALMER.cbssNumber,
      cbssTotal: doc.total,
      lufranQuote: PALMER.lufranQuote,
      lufranTotal: PALMER.lufranTotal,
      date: PALMER.date,
    },
    null,
    2,
  ),
);
console.log(out, doc.total, PALMER.lufranTotal);
