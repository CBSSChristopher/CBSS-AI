import { BRAND, COMPANY } from "./document.ts";

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
    .replace(/[–—−]/g, "-")
    .replace(/·/g, " | ")
    .replace(/’/g, "'")
    .replace(/“|”/g, '"')
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(text: string, width: number, fontSize: number): string[] {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  if (!words[0]) return [];
  const max = Math.max(8, Math.floor(width / (fontSize * 0.48)));
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
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
  stroke(hex: string) {
    const [r, g, b] = hexRgb(hex);
    this.bits.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }
  rect(x: number, y: number, w: number, h: number, hex: string) {
    this.fill(hex);
    this.bits.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  }
  frame(x: number, y: number, w: number, h: number, hex: string) {
    this.stroke(hex);
    this.bits.push("0.8 w");
    this.bits.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
  }
  text(x: number, y: number, size: number, hex: string, value: string, font: "F1" | "F2" | "F3" = "F1") {
    this.fill(hex);
    this.bits.push("BT");
    this.bits.push(`/${font} ${size} Tf`);
    this.bits.push(`${x.toFixed(1)} ${y.toFixed(1)} Td`);
    this.bits.push(`(${pdfEscape(value)}) Tj`);
    this.bits.push("ET");
  }
  stream(): string {
    return `${this.bits.join("\n")}\n`;
  }
}

function bodyBlock(page: Page, x: number, y: number, w: number, title: string, lines: string[]): number {
  page.text(x, y, 11, BRAND.gold, title, "F2");
  let cy = y - 16;
  for (const line of lines) {
    for (const wrapped of wrap(line, w, 9)) {
      page.text(x, cy, 9, BRAND.ink, wrapped);
      cy -= 12;
    }
    cy -= 4;
  }
  return cy - 8;
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
  const font3 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
  const contentObjIds = contents.map((stream) => {
    const bytes = new TextEncoder().encode(stream).length;
    return add(`<< /Length ${bytes} >>\nstream\n${stream}endstream`);
  });
  const kids: number[] = [];
  contentObjIds.forEach((cid) => {
    kids.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R /F3 ${font3} 0 R >> >> /Contents ${cid} 0 R >>`,
      ),
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${kids.map((id) => `${id} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [enc.encode("%PDF-1.4\n")];
  let size = chunks[0].length;
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(size);
    const obj = enc.encode(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
    chunks.push(obj);
    size += obj.length;
  }
  const xref = size;
  let tail = `xref\n0 ${objects.length + 1}\n`;
  tail += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    tail += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  tail += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  chunks.push(enc.encode(tail));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Branded Next Steps guide. No prices, ACH, routing, or collection language. */
export function renderNextStepsPdf(): Uint8Array {
  const c = COMPANY;
  const p1 = new Page();
  p1.rect(0, 732, 612, 60, BRAND.navy);
  p1.rect(0, 728, 612, 4, BRAND.gold);
  p1.text(36, 756, 18, "#FFFFFF", "CB", "F3");
  p1.text(64, 756, 14, "#FFFFFF", c.brand, "F2");
  p1.text(36, 740, 9, BRAND.gold, "NEXT STEPS AFTER YOUR ORDER", "F2");

  p1.text(36, 700, 16, BRAND.navy, "Thank you. Your order is moving forward.", "F2");
  p1.text(36, 682, 10, BRAND.muted, "Read this short guide before planning anyone on-site.");

  let y = 650;
  y = bodyBlock(p1, 36, y, 540, "1. PAYMENT RECEIVED", [
    "We have received your payment and your order is in motion. This note is only about what happens next. Your sales representative remains your first point of contact.",
  ]);
  y = bodyBlock(p1, 36, y, 540, "2. QUALITY CHECK AND RELEASE", [
    "The depot inspects the unit and releases it for dispatch. Release timing depends on the depot, not on a promise in this email. We do not invent a pickup or delivery date here.",
  ]);
  y = bodyBlock(p1, 36, y, 540, "3. DRIVER SCHEDULING", [
    "After release, we schedule the driver. You will hear from us when that window is real. Do not hire labor, block a street, or take time off work based on an estimate.",
  ]);
  bodyBlock(p1, 36, y, 540, "4. DELIVERY WINDOW", [
    "We confirm the delivery window with you before anyone should be waiting on-site. If the site is not ready, the trip can be rescheduled and extra trip charges can apply. Clear access, a firm pad or ground the truck can use, and a path without low wires or tight turns are your responsibility unless we agreed otherwise in writing.",
  ]);

  p1.text(36, 48, 8, BRAND.muted, `${c.legal} dba ${c.dba}  |  ${c.street}, ${c.cityMail}  |  ${c.phone}`);
  p1.text(480, 48, 8, BRAND.muted, "Page 1 of 2");

  const p2 = new Page();
  p2.rect(0, 732, 612, 60, BRAND.navy);
  p2.rect(0, 728, 612, 4, BRAND.gold);
  p2.text(36, 756, 18, "#FFFFFF", "CB", "F3");
  p2.text(64, 756, 14, "#FFFFFF", c.brand, "F2");
  p2.text(36, 740, 9, BRAND.gold, "NEXT STEPS AFTER YOUR ORDER", "F2");

  y = 690;
  y = bodyBlock(p2, 36, y, 540, "5. WHO TO CALL", [
    "Your sales representative is still the first point of contact. Reply to the email that included this guide, or call the office if you cannot reach them.",
    `Office: ${c.phone}  |  ${c.site}`,
  ]);
  y = bodyBlock(p2, 36, y, 540, "6. WHAT THIS GUIDE IS NOT", [
    "This is not an invoice, a quote, a delivery appointment, or a change to the deal you already accepted. It does not collect payment information. Keep your invoice for banking details.",
  ]);
  p2.rect(36, y - 70, 540, 86, BRAND.cream);
  p2.frame(36, y - 70, 540, 86, BRAND.gold);
  p2.text(48, y + 2, 10, BRAND.navy, "Before anyone waits on-site", "F2");
  p2.text(48, y - 16, 9, BRAND.ink, "Wait for a confirmed window from CB Shipping Solutions.");
  p2.text(48, y - 30, 9, BRAND.ink, "Have the site clear and reachable for the truck.");
  p2.text(48, y - 44, 9, BRAND.ink, "Ask your representative if anything about access or timing is unclear.");

  p2.text(36, 120, 10, BRAND.navy, "Thank you for your business.", "F2");
  p2.text(36, 104, 9, BRAND.ink, c.dba);
  p2.text(36, 90, 9, BRAND.ink, `https://${c.site}/`);

  p2.text(36, 48, 8, BRAND.muted, `${c.legal} dba ${c.dba}  |  ${c.street}, ${c.cityMail}  |  ${c.phone}`);
  p2.text(480, 48, 8, BRAND.muted, "Page 2 of 2");

  return assemblePdf([p1.stream(), p2.stream()]);
}
