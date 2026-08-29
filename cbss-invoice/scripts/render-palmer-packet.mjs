import { mkdirSync, writeFileSync } from "node:fs";
import {
  ASHDOD,
  PALMER,
  buildPalmerAshdodDocument,
  buildPalmerCbssDocument,
  renderPalmerAshdodPacketHtml,
  renderPalmerPacketHtml,
} from "../src/packet.ts";

const out = process.argv[2] || "/opt/cursor/artifacts/jamie-palmer-packet";
mkdirSync(out, { recursive: true });
const tema = buildPalmerCbssDocument();
const ashdod = buildPalmerAshdodDocument();
writeFileSync(`${out}/CBSS-Jamie-Palmer-Tema-Packet.html`, renderPalmerPacketHtml());
writeFileSync(`${out}/CBSS-Jamie-Palmer-Ashdod-Packet.html`, renderPalmerAshdodPacketHtml());
writeFileSync(
  `${out}/packet.json`,
  JSON.stringify(
    {
      billTo: PALMER.billTo.name,
      email: PALMER.billTo.email,
      load1: { cbssNumber: PALMER.cbssNumber, cbssTotal: tema.total, ocean: PALMER.lufranQuote, oceanTotal: PALMER.lufranTotal },
      load2: { cbssNumber: ASHDOD.cbssNumber, cbssTotal: ashdod.total, ocean: ASHDOD.oceanQuote, oceanTotal: ASHDOD.oceanTotal },
      date: PALMER.date,
    },
    null,
    2,
  ),
);
console.log(out, tema.total, PALMER.lufranTotal, ashdod.total, ASHDOD.oceanTotal);
