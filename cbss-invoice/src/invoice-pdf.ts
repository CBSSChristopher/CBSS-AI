import {
  BANK,
  BRAND,
  COMPANY,
  itemAmount,
  money,
  wireGross,
  type InvoiceDocument,
  type Party,
} from "./document.ts";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function pdfEscape(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ");
}

function wrap(text: string, width: number, fontSize: number): string[] {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  if (!words[0]) return [];
  const max = Math.max(8, Math.floor(width / (fontSize * 0.5)));
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? cur + " " + word : word;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

class Page {
  bits: string[] = [];
  fill(hex: string) {
    const [r, g, b] = hexRgb(hex);
    this.bits.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  }
  rect(x: number, y: number, w: number, h: number, hex: string) {
    this.fill(hex);
    this.bits.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  }
  text(x: number, y: number, size: number, hex: string, value: string, bold = false) {
    this.fill(hex);
    this.bits.push("BT");
    this.bits.push(`/${bold ? "F2" : "F1"} ${size} Tf`);
    this.bits.push(`${x.toFixed(1)} ${y.toFixed(1)} Td`);
    this.bits.push(`(${pdfEscape(value)}) Tj`);
    this.bits.push("ET");
  }
  stream(): string {
    return this.bits.join("\n") + "\n";
  }
}

function partyBlock(page: Page, x: number, y: number, w: number, title: string, party: Party, extra: string[] = []) {
  page.rect(x, y - 86, w, 90, BRAND.cream);
  page.text(x + 8, y - 14, 8, BRAND.gold, title, true);
  const company = String(party.company || "").trim();
  const lines = [
    party.name,
    company,
    ...party.lines.filter((line) => String(line || "").trim() && String(line).trim() !== company),
    party.phone || "",
    party.email || "",
    ...extra,
  ].filter(Boolean);
  let ty = y - 28;
  for (const line of lines.slice(0, 5)) {
    page.text(x + 8, ty, 8, BRAND.ink, line, line === party.name);
    ty -= 11;
  }
}

export function invoicePdfName(number: string): string {
  const n = String(number || "invoice").replace(/[^\w.-]+/g, "-");
  return n.endsWith(".pdf") ? n : n + ".pdf";
}

export function renderInvoicePdf(doc: InvoiceDocument): Uint8Array {
  const c = COMPANY;
  const b = BANK;
  const wire = wireGross(doc.total);
  const p1 = new Page();
  const p2 = new Page();

  const header = (page: Page) => {
    page.rect(36, 730, 540, 46, BRAND.navy);
    page.rect(36, 726, 540, 4, BRAND.gold);
    page.text(48, 756, 11, "#FFFFFF", c.brand, true);
    page.text(48, 744, 8, BRAND.gold, `${c.legal} · EIN ${c.ein} · NEW & USED SHIPPING CONTAINERS`, true);
    page.text(48, 734, 8, "#E8EDF3", `${c.street}, ${c.cityLine} · ${c.phone}`);
    page.text(430, 756, 8, "#FFFFFF", "INVOICE", true);
    page.text(430, 742, 14, BRAND.gold, doc.number, true);
    page.text(430, 732, 8, "#E8EDF3", `${doc.date} · ${doc.due}`);
  };

  header(p1);
  partyBlock(p1, 36, 710, 174, "FROM / SELLER", {
    name: c.legal,
    company: `d/b/a ${c.dba}`,
    lines: [c.street, c.cityLine, `EIN ${c.ein}`, c.phone],
  });
  partyBlock(p1, 219, 710, 174, "BILL TO", doc.billTo);
  partyBlock(p1, 402, 710, 174, "SHIP TO", doc.shipTo);

  p1.rect(36, 604, 540, 18, BRAND.navy);
  const banner = wrap(doc.banner, 520, 8)[0] || doc.banner;
  p1.text(44, 610, 8, BRAND.gold, banner, true);

  p1.rect(36, 582, 540, 16, BRAND.navy);
  p1.text(44, 587, 8, BRAND.gold, "DESCRIPTION", true);
  p1.text(360, 587, 8, BRAND.gold, "QTY", true);
  p1.text(410, 587, 8, BRAND.gold, "UNIT", true);
  p1.text(500, 587, 8, BRAND.gold, "AMOUNT", true);

  let y = 566;
  for (const item of doc.items) {
    const titleLines = wrap(item.title, 300, 9);
    p1.text(44, y, 9, BRAND.ink, titleLines[0] || item.title, true);
    p1.text(368, y, 9, BRAND.ink, String(item.qty));
    p1.text(410, y, 9, BRAND.ink, money(item.unit));
    p1.text(500, y, 9, BRAND.ink, money(itemAmount(item)));
    y -= 12;
    if (item.detail) {
      for (const line of wrap(item.detail, 300, 8).slice(0, 2)) {
        p1.text(44, y, 8, BRAND.muted, line);
        y -= 10;
      }
    }
    y -= 4;
  }

  y -= 6;
  p1.text(44, y, 8, BRAND.ink, "INVOICE NOTES", true);
  y -= 12;
  for (const note of doc.notes) {
    for (const line of wrap(note, 320, 8).slice(0, 3)) {
      p1.text(44, y, 8, BRAND.ink, line);
      y -= 10;
    }
    y -= 2;
  }
  p1.rect(400, 430, 176, 70, "#F4F7FB");
  p1.text(410, 484, 9, BRAND.ink, `Subtotal    ${money(doc.subtotal)}`);
  p1.text(410, 470, 9, BRAND.ink, `Tax         ${money(doc.tax)}`);
  p1.rect(400, 430, 176, 22, BRAND.navy);
  p1.text(410, 438, 10, BRAND.gold, `TOTAL DUE  ${money(doc.total)}`, true);

  y = Math.min(y, 400);
  p1.rect(36, y - 70, 540, 74, BRAND.mint);
  p1.text(44, y - 12, 8, "#1D6B4A", doc.warrantyTitle, true);
  let wy = y - 24;
  for (const line of doc.warranty.flatMap((n) => wrap(n, 520, 8)).slice(0, 4)) {
    p1.text(44, wy, 8, BRAND.ink, line);
    wy -= 10;
  }
  y = wy - 10;
  p1.rect(36, y - 70, 540, 74, BRAND.cream2);
  p1.text(44, y - 12, 8, BRAND.gold, doc.termsTitle, true);
  let ty = y - 24;
  for (const line of doc.terms.flatMap((n) => wrap(n, 520, 8)).slice(0, 4)) {
    p1.text(44, ty, 8, BRAND.ink, line);
    ty -= 10;
  }
  p1.text(36, 40, 8, BRAND.muted, `${c.legal} · ${c.street}, ${c.cityMail} · ${c.phone}`);
  p1.text(430, 40, 8, BRAND.muted, `Invoice ${doc.number} · Page 1 of 2`);

  header(p2);
  p2.text(36, 704, 18, BRAND.navy, "How to Pay", true);
  p2.text(36, 688, 9, BRAND.ink, `USD only. Memo / addenda: ${doc.number}`);
  p2.rect(36, 666, 540, 16, BRAND.gold);
  p2.text(44, 671, 8, BRAND.navy, "ACH / E-CHECK — PREFERRED · NO INCOMING FEE", true);
  p2.rect(36, 500, 540, 166, BRAND.navy);
  const ach = [
    ["Recipient", b.recipient],
    ["Address", `${b.address}, ${b.cityZip}`],
    ["Phone / EIN", `${b.phone} · ${b.ein}`],
    ["Bank", `${b.bank} · ${b.bankStreet}, ${b.bankCity}`],
    ["Routing (ACH)", b.routing],
    ["Account", `${b.account} · ${b.accountType}`],
    ["Amount", `${money(doc.total)} USD`],
  ];
  let ay = 648;
  p2.text(44, ay, 8, "#FFFFFF", `Pay ${money(doc.total)} USD by ACH or e-check. Usually arrives in 1–3 business days.`);
  ay -= 16;
  for (const [label, value] of ach) {
    p2.text(44, ay, 8, BRAND.gold, label, true);
    p2.text(150, ay, 8, "#FFFFFF", value);
    ay -= 12;
  }

  p2.rect(36, 400, 540, 88, BRAND.navy);
  p2.text(44, 472, 9, BRAND.gold, "DOMESTIC WIRE · U.S. BANKS", true);
  p2.text(44, 456, 8, "#FFFFFF", "Same recipient, address, bank, account number, and routing as above.");
  p2.text(44, 444, 8, "#FFFFFF", `Wire routing number: ${b.routing}`);
  p2.text(44, 432, 8, "#FFFFFF", `A $${b.wireFee} incoming wire fee is deducted. Wire ${money(wire)} to net ${money(doc.total)}.`);
  p2.text(44, 420, 8, "#FFFFFF", "Domestic wires can take up to 24 hours.");

  p2.rect(36, 286, 540, 102, BRAND.cream2);
  p2.text(44, 372, 9, BRAND.gold, "INTERNATIONAL SWIFT · IF PAYING FROM OUTSIDE THE U.S.", true);
  p2.text(44, 356, 8, BRAND.ink, `Recipient: ${b.recipient} · ${b.address}, ${b.cityZip}, United States`);
  p2.text(44, 344, 8, BRAND.ink, `Account number: ${b.account} · Wire routing: ${b.routing}`);
  p2.text(44, 332, 8, BRAND.ink, `SWIFT / BIC: ${b.swift} · Intermediary BIC: ${b.intermediary}`);
  for (const line of wrap(`Bank: ${b.swiftBank}`, 520, 8)) {
    p2.text(44, 320, 8, BRAND.ink, line);
    break;
  }
  p2.text(44, 308, 8, BRAND.ink, "SWIFT transfers may take 3–5 business days.");

  p2.text(36, 260, 9, BRAND.ink, "OTHER METHODS", true);
  p2.text(36, 246, 8, BRAND.ink, "Card payments: request a PayPal Business invoice from us.");
  p2.text(36, 234, 8, BRAND.ink, `Checks (if used): payable to ${c.legal}, mail to ${c.street}, ${c.cityMail}.`);
  p2.text(36, 222, 8, BRAND.ink, "Do not send cash.");
  for (const line of wrap(doc.remittance, 540, 8).slice(0, 2)) {
    p2.text(36, 210, 8, BRAND.ink, line);
    break;
  }
  p2.text(36, 40, 8, BRAND.muted, `${c.legal} · ${c.street}, ${c.cityMail} · ${c.phone}`);
  p2.text(430, 40, 8, BRAND.muted, `Invoice ${doc.number} · Page 2 of 2`);

  return assemblePdf([p1.stream(), p2.stream()]);
}

function assemblePdf(contents: string[]): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Kids [] /Count 0 >>");
  const font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const contentObjIds = contents.map((stream) => {
    const body = stream;
    return add(`<< /Length ${body.length} >>\nstream\n${body}endstream`);
  });
  const kids: number[] = [];
  contentObjIds.forEach((cid) => {
    kids.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${cid} 0 R >>`,
      ),
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${kids.map((id) => id + " 0 R").join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
