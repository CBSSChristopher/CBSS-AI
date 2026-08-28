export const BRAND = {
  navy: "#0B1F3A",
  gold: "#C9A227",
  cream: "#F7F4EC",
  cream2: "#FBF6E8",
  mint: "#ECFDF3",
  mintInk: "#1D6B4A",
  slate: "#F4F7FB",
  ink: "#111111",
  muted: "#5B6570",
  sans: 'Helvetica, Arial, "Segoe UI", sans-serif',
  serif: '"Times New Roman", Times, Georgia, serif',
};

export const COMPANY = {
  legal: "CBGC LLC",
  dba: "CB Shipping Solutions",
  brand: "CB SHIPPING SOLUTIONS",
  ein: "99-2031187",
  street: "1412 Lockwood Drive",
  cityLine: "Corning, AR 72422-3008",
  cityMail: "Corning, AR 72422",
  phone: "(870) 323-2593",
  site: "cbshippingsolutions.app",
};

export const BANK = {
  recipient: "CBGC LLC",
  address: "1412 Lockwood Drive",
  cityZip: "Corning, AR 72422-3008",
  phone: "(870) 323-2593",
  ein: "99-2031187",
  accountType: "Checking",
  bank: "Lead Bank",
  bankStreet: "1801 Main Street",
  bankCity: "Kansas City, MO 64108",
  routing: "101019644",
  account: "212719485341",
  swift: "REVOUS31",
  intermediary: "CHASGB2L",
  swiftBank: "Revolut Technologies Inc, 107 Greenwich Street, Floor 20, New York, NY 10006",
  wireFee: 10,
};

export type Party = {
  name: string;
  company?: string;
  lines: string[];
  phone?: string;
  email?: string;
};

export type LineItem = {
  title: string;
  detail?: string;
  qty: number;
  unit: number;
};

export type InvoiceDocument = {
  number: string;
  date: string;
  due: string;
  banner: string;
  billTo: Party;
  shipTo: Party;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string[];
  warrantyTitle: string;
  warranty: string[];
  termsTitle: string;
  terms: string[];
  remittance: string;
  warrantyKind: "wwt" | "one-trip";
};

const DOC_PREFIX = "doc:";
const SEQ_KEY = "next-cbs-number";
const FIRST_NEXT = 111;

export function money(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatInvoiceDate(raw?: string, timeZone = "America/Chicago"): string {
  if (raw && !/^\d{4}-\d{2}-\d{2}/.test(raw) && /[A-Za-z]/.test(raw)) return raw;
  const d = raw ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) return raw || "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone });
}

export function cbsNumber(n: number, year = 2026): string {
  return `CBS-${year}-${String(n).padStart(3, "0")}`;
}

export function itemAmount(item: LineItem): number {
  return Math.round(item.qty * item.unit * 100) / 100;
}

export function wireGross(total: number): number {
  return Math.round((total + BANK.wireFee) * 100) / 100;
}

export function parseItems(raw: unknown, fallbackTitle: string, fallbackAmount: number): LineItem[] | { error: string } {
  const title = String(fallbackTitle || "").trim();
  if (!Array.isArray(raw) || !raw.length) {
    if (!title) return { error: "Type what this invoice is for." };
    return [{ title, qty: 1, unit: fallbackAmount }];
  }
  const items: LineItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const itemTitle = String(rec.title || rec.description || "").trim().slice(0, 180);
    const detail = String(rec.detail || rec.notes || "").trim().slice(0, 240);
    const qty = Number(rec.qty ?? rec.quantity ?? 1);
    const unit = Number(rec.unit ?? rec.unitPrice ?? rec.amount);
    if (!itemTitle || !Number.isFinite(qty) || qty <= 0 || qty > 99) {
      return { error: "Each line needs a description and a quantity." };
    }
    if (!Number.isFinite(unit)) return { error: "Type the exact dollar amount Christopher set. Do not invent one." };
    items.push({ title: itemTitle, detail: detail || undefined, qty, unit: Math.round(unit * 100) / 100 });
  }
  if (!items.length) return { error: "Type what this invoice is for." };
  return items;
}

export function warrantyCopy(kind: "wwt" | "one-trip", plural: boolean): { title: string; lines: string[] } {
  const unit = plural ? "each container" : "this container";
  const units = plural ? "Both units are" : "This unit is";
  if (kind === "one-trip") {
    return {
      title: "WARRANTY · ONE-TRIP",
      lines: [
        `${units} air- and water-leak-test verified before dispatch. One-trip warranty from date of delivery: 10-year structural warranty and 10-year no-leak warranty, plus the manufacturer’s warranty.`,
        "Covers structural integrity and water-tightness under normal stationary / storage use. Does not cover modification, cutting, stacking abuse, improper site prep, collision, flood, or neglect. Claims require photos and this invoice number. Remedy is repair or, at seller's option, replacement of the affected unit. Manufacturer warranty terms apply in addition to CBGC LLC’s 10-year coverage.",
      ],
    };
  }
  return {
    title: plural ? "WARRANTY · EACH UNIT" : "WARRANTY",
    lines: [
      `${units} air- and water-leak-test verified before dispatch. Used-unit warranty from date of delivery: 5-year structural warranty and 5-year no-leak warranty on ${unit}.`,
      "Covers structural integrity and water-tightness under normal stationary / storage use. Does not cover modification, cutting, stacking abuse, improper site prep, collision, flood, or neglect. Claims require photos and this invoice number. Remedy is repair or, at seller's option, replacement of the affected unit.",
    ],
  };
}

export type DocumentInput = {
  number: string;
  date?: string;
  due?: string;
  banner?: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  billingLines: string[];
  shippingLines: string[];
  shipNote?: string;
  items: LineItem[];
  tax?: number;
  notes?: string[];
  warrantyKind?: "wwt" | "one-trip";
  remittance?: string;
};

export function buildInvoiceDocument(input: DocumentInput): InvoiceDocument {
  const items = input.items;
  const subtotal = Math.round(items.reduce((sum, item) => sum + itemAmount(item), 0) * 100) / 100;
  const tax = Math.round((input.tax || 0) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const plural = items.reduce((sum, item) => sum + item.qty, 0) > 1;
  const warranty = warrantyCopy(input.warrantyKind || "wwt", plural);
  const phone = formatPhone(input.phone);
  return {
    number: input.number,
    date: formatInvoiceDate(input.date),
    due: input.due || "Due prior to dispatch",
    banner: (input.banner || input.items[0]?.title || "CONTAINER SALE").toUpperCase(),
    billTo: {
      name: input.name,
      company: input.company,
      lines: input.billingLines.filter(Boolean),
      phone,
      email: input.email,
    },
    shipTo: {
      name: input.name,
      company: input.company,
      lines: input.shippingLines.filter(Boolean),
    },
    items,
    subtotal,
    tax,
    total,
    notes: input.notes?.length
      ? input.notes
      : [
          `Total of ${money(total)} is due in full before dispatch.`,
          "Bills of sale issued after funds clear. Delivery scheduled after confirmation.",
          `USD only. Put invoice ${input.number} in the payment memo / addenda.`,
        ],
    warrantyTitle: warranty.title,
    warranty: warranty.lines,
    termsTitle: "SITE ACCESS · TERMS",
    terms: [
      input.shipNote ||
        "Buyer provides a clear, level, firm drop site with truck/trailer access and no overhead obstruction.",
      "Extra charges apply for crane, permits, after-hours, or difficult access.",
      "Title / bills of sale transfer after cleared payment. Questions: (870) 323-2593.",
      "Thank you for choosing CB Shipping Solutions.",
    ],
    remittance: input.remittance || "After you send payment, email remittance confirmation so we can schedule delivery.",
    warrantyKind: input.warrantyKind || "wwt",
  };
}

function formatPhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw || "";
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function partyHtml(title: string, party: Party, extra: string[] = []): string {
  const company = String(party.company || "").trim();
  const lines = party.lines.filter((line) => String(line || "").trim() && String(line).trim() !== company);
  const bits = [
    party.name ? `<strong>${escapeHtml(party.name)}</strong>` : "",
    company ? escapeHtml(company) : "",
    ...lines.map((line) => escapeHtml(line)),
    party.phone ? escapeHtml(party.phone) : "",
    party.email ? escapeHtml(party.email) : "",
    ...extra.map((line) => escapeHtml(line)),
  ].filter(Boolean);
  return `<div class="party">
    <h3>${escapeHtml(title)}</h3>
    <p>${bits.join("<br>")}</p>
  </div>`;
}

function kvRow(label: string, value: string): string {
  return `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function renderInvoiceHtml(doc: InvoiceDocument): string {
  const { navy, gold, cream, cream2, mint, mintInk, slate, ink, muted, sans, serif } = BRAND;
  const c = COMPANY;
  const b = BANK;
  const wire = wireGross(doc.total);
  const rows = doc.items
    .map((item) => {
      return `<tr>
        <td>
          <div class="item-title">${escapeHtml(item.title)}</div>
          ${item.detail ? `<div class="item-detail">${escapeHtml(item.detail)}</div>` : ""}
        </td>
        <td class="num">${escapeHtml(String(item.qty))}</td>
        <td class="num">${escapeHtml(money(item.unit))}</td>
        <td class="num">${escapeHtml(money(itemAmount(item)))}</td>
      </tr>`;
    })
    .join("");

  const notes = doc.notes.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const warranty = doc.warranty.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const terms = doc.terms.map((line) => `<p>${escapeHtml(line)}</p>`).join("");

  const header = `<header class="bar">
    <div class="brand-left">
      <div class="mark" aria-hidden="true"><span>CB</span></div>
      <div>
        <div class="co">${escapeHtml(c.brand)}</div>
        <div class="goldline">${escapeHtml(c.legal)} · EIN ${escapeHtml(c.ein)} · NEW &amp; USED SHIPPING CONTAINERS</div>
        <div class="fine">${escapeHtml(c.street)}, ${escapeHtml(c.cityLine)}</div>
        <div class="fine">${escapeHtml(c.phone)} · ${escapeHtml(c.site)}</div>
      </div>
    </div>
    <div class="brand-right">
      <div class="inv-label">INVOICE</div>
      <div class="inv-no">${escapeHtml(doc.number)}</div>
      <div class="fine">${escapeHtml(doc.date)}</div>
      <div class="fine">${escapeHtml(doc.due)}</div>
    </div>
  </header>
  <div class="goldrule"></div>`;

  const footer = (page: number) =>
    `<footer>
      <span>${escapeHtml(c.legal)} · ${escapeHtml(c.street)}, ${escapeHtml(c.cityMail)} · ${escapeHtml(c.phone)}</span>
      <span>Invoice ${escapeHtml(doc.number)} · Page ${page} of 2</span>
    </footer>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(doc.number)}</title>
  <style>
    @page { size: letter; margin: 0.42in 0.48in 0.42in; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #fff; color: ${ink}; }
    body { font: 10.5px/1.4 ${sans}; }
    .page { min-height: 10.1in; display: flex; flex-direction: column; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .bar {
      background: ${navy}; color: #fff; display: flex; justify-content: space-between; gap: 16px;
      padding: 14px 16px 12px; border-radius: 2px;
    }
    .brand-left { display: flex; gap: 12px; align-items: center; }
    .mark {
      width: 54px; height: 54px; border-radius: 50%; flex: 0 0 auto;
      border: 2px solid ${gold}; box-shadow: 0 0 0 2px ${navy}, 0 0 0 3.5px ${gold};
      display: flex; align-items: center; justify-content: center;
      font: 700 20px/1 ${serif}; color: ${gold}; letter-spacing: .02em;
    }
    .co { font: 700 16px/1.15 ${sans}; letter-spacing: .06em; }
    .goldline { color: ${gold}; font-size: 9.5px; letter-spacing: .04em; margin-top: 3px; font-weight: 700; }
    .fine { font-size: 10px; color: #e8edf3; margin-top: 1px; }
    .brand-right { text-align: right; }
    .inv-label { font-size: 10px; letter-spacing: .16em; font-weight: 700; }
    .inv-no { font: 700 22px/1.1 ${serif}; color: ${gold}; margin: 2px 0 3px; }
    .goldrule { height: 4px; background: ${gold}; margin-bottom: 12px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
    .party { background: ${cream}; border-radius: 8px; padding: 9px 10px; min-height: 108px; }
    .party h3 { margin: 0 0 6px; color: ${gold}; font-size: 10px; letter-spacing: .08em; }
    .party p { margin: 0; }
    .banner {
      background: ${navy}; color: ${gold}; text-align: center; font-weight: 700;
      letter-spacing: .05em; padding: 8px 10px; border-radius: 8px; margin: 0 0 10px;
    }
    table.lines { width: 100%; border-collapse: collapse; }
    table.lines th {
      background: ${navy}; color: ${gold}; text-align: left; font-size: 10px; letter-spacing: .06em;
      padding: 7px 8px;
    }
    table.lines th.num, table.lines td.num { text-align: right; white-space: nowrap; width: 88px; }
    table.lines td { padding: 8px; border-bottom: 1px solid #e4e7eb; vertical-align: top; }
    .item-title { font-weight: 700; }
    .item-detail { color: ${muted}; font-size: 10px; margin-top: 2px; }
    .split { display: grid; grid-template-columns: 1.2fr .8fr; gap: 16px; margin-top: 12px; }
    .notes p { margin: 0 0 6px; }
    .totals { background: ${slate}; border-radius: 8px; padding: 8px 10px; }
    .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
    .due { background: ${navy}; color: ${gold}; border-radius: 6px; padding: 8px 10px; margin-top: 6px;
      display: flex; justify-content: space-between; font: 700 13px/1.2 ${sans}; }
    .box { border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
    .box h2 { margin: 0 0 6px; font-size: 11px; letter-spacing: .08em; }
    .box p { margin: 0 0 5px; }
    .mint { background: ${mint}; }
    .mint h2 { color: ${mintInk}; }
    .cream { background: ${cream2}; }
    .cream h2 { color: ${gold}; }
    footer {
      margin-top: auto; padding-top: 10px; border-top: 1px solid #d8dde3;
      display: flex; justify-content: space-between; color: ${muted}; font-size: 9.5px;
    }
    h1.pay { font: 700 26px/1.1 ${serif}; color: ${navy}; margin: 8px 0 6px; }
    .lead { margin: 0 0 10px; color: ${ink}; }
    .paybox { border-radius: 10px; overflow: hidden; margin: 0 0 12px; }
    .paybox .cap { background: ${gold}; color: ${navy}; font-weight: 700; letter-spacing: .05em;
      padding: 8px 12px; font-size: 11px; }
    .paybox .body { background: ${navy}; color: #fff; padding: 10px 12px 12px; }
    .paybox .body p { margin: 0 0 8px; }
    .kv { display: grid; grid-template-columns: 130px 1fr; gap: 2px 10px; font-size: 10.5px; }
    .kv span { color: ${gold}; font-weight: 700; }
    .kv strong { font-weight: 600; color: #fff; }
    .wire { background: ${navy}; color: #fff; border-radius: 10px; padding: 12px; margin: 0 0 12px; }
    .wire h2 { margin: 0 0 6px; color: ${gold}; font-size: 12px; letter-spacing: .06em; }
    .wire p { margin: 0 0 5px; }
    .swift { background: ${cream2}; border-radius: 10px; padding: 12px; margin: 0 0 12px; }
    .swift h2 { margin: 0 0 6px; color: ${gold}; font-size: 12px; letter-spacing: .06em; }
    .other p { margin: 0 0 5px; }
    @media print { .noprint { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <section class="page">
    ${header}
    <div class="parties">
      ${partyHtml("FROM / SELLER", {
        name: c.legal,
        company: `d/b/a ${c.dba}`,
        lines: [c.street, c.cityLine, `EIN ${c.ein}`, c.phone],
      })}
      ${partyHtml("BILL TO", doc.billTo)}
      ${partyHtml("SHIP TO", doc.shipTo)}
    </div>
    <div class="banner">${escapeHtml(doc.banner)}</div>
    <table class="lines">
      <thead>
        <tr><th>DESCRIPTION</th><th class="num">QTY</th><th class="num">UNIT PRICE</th><th class="num">AMOUNT</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="split">
      <div class="notes"><h2 style="margin:0 0 6px;letter-spacing:.08em;font-size:11px">INVOICE NOTES</h2>${notes}</div>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${escapeHtml(money(doc.subtotal))}</span></div>
        <div class="row"><span>Tax</span><span>${escapeHtml(money(doc.tax))}</span></div>
        <div class="due"><span>TOTAL DUE</span><span>${escapeHtml(money(doc.total))}</span></div>
      </div>
    </div>
    <div class="box mint"><h2>${escapeHtml(doc.warrantyTitle)}</h2>${warranty}</div>
    <div class="box cream"><h2>${escapeHtml(doc.termsTitle)}</h2>${terms}</div>
    ${footer(1)}
  </section>
  <section class="page">
    ${header}
    <h1 class="pay">How to Pay</h1>
    <p class="lead">USD only. Using another currency can send funds to the wrong account. Memo / addenda: <strong>${escapeHtml(doc.number)}</strong></p>
    <div class="paybox">
      <div class="cap">ACH / E-CHECK — PREFERRED · NO INCOMING FEE</div>
      <div class="body">
        <p>Pay ${escapeHtml(money(doc.total))} USD by ACH or e-check. Usually arrives in 1–3 business days.</p>
        ${kvRow("Recipient", b.recipient)}
        ${kvRow("Address", b.address)}
        ${kvRow("City / ZIP", b.cityZip)}
        ${kvRow("Phone", b.phone)}
        ${kvRow("EIN / tax ID", b.ein)}
        ${kvRow("Account type", b.accountType)}
        ${kvRow("Bank", b.bank)}
        ${kvRow("Bank address", b.bankStreet)}
        ${kvRow("Bank city", b.bankCity)}
        ${kvRow("Routing (ACH)", b.routing)}
        ${kvRow("Account number", b.account)}
        ${kvRow("Amount", `${money(doc.total)} USD`)}
      </div>
    </div>
    <div class="wire">
      <h2>DOMESTIC WIRE · U.S. BANKS</h2>
      <p>Same recipient, address, bank, account number, and routing as above.</p>
      <p>Wire routing number: ${escapeHtml(b.routing)}</p>
      <p>A $${b.wireFee} incoming wire fee is deducted from the amount received. Wire ${escapeHtml(money(wire))} to net ${escapeHtml(money(doc.total))}.</p>
      <p>Domestic wires can take up to 24 hours.</p>
    </div>
    <div class="swift">
      <h2>INTERNATIONAL SWIFT · IF PAYING FROM OUTSIDE THE U.S.</h2>
      <p>Recipient: ${escapeHtml(b.recipient)} · ${escapeHtml(b.address)}, ${escapeHtml(b.cityZip)}, United States</p>
      <p>Account number: ${escapeHtml(b.account)} · Wire routing: ${escapeHtml(b.routing)}</p>
      <p>SWIFT / BIC: ${escapeHtml(b.swift)} · Intermediary BIC: ${escapeHtml(b.intermediary)}</p>
      <p>Bank: ${escapeHtml(b.swiftBank)}</p>
      <p>SWIFT transfers may take 3–5 business days. Your bank may charge an outgoing fee and may ask for the intermediary BIC.</p>
    </div>
    <div class="other">
      <p><strong>OTHER METHODS</strong></p>
      <p>Card payments: request a PayPal Business invoice from us.</p>
      <p>Checks (if used): payable to ${escapeHtml(c.legal)}, mail to ${escapeHtml(c.street)}, ${escapeHtml(c.cityMail)}.</p>
      <p>Do not send cash.</p>
      <p>${escapeHtml(doc.remittance)}</p>
    </div>
    ${footer(2)}
  </section>
</body>
</html>`;
}

export async function nextCbsNumber(env: Env): Promise<string> {
  if (!env.INVOICE_STORE) return cbsNumber(FIRST_NEXT);
  const raw = await env.INVOICE_STORE.get(SEQ_KEY);
  const current = raw ? Number(raw) : FIRST_NEXT;
  const n = Number.isFinite(current) && current >= FIRST_NEXT ? current : FIRST_NEXT;
  await env.INVOICE_STORE.put(SEQ_KEY, String(n + 1));
  return cbsNumber(n);
}

export async function saveDocument(env: Env, doc: InvoiceDocument): Promise<void> {
  if (!env.INVOICE_STORE) return;
  await env.INVOICE_STORE.put(DOC_PREFIX + doc.number, JSON.stringify(doc));
}

export async function readDocument(env: Env, number: string): Promise<InvoiceDocument | null> {
  if (!env.INVOICE_STORE) return null;
  const raw = await env.INVOICE_STORE.get(DOC_PREFIX + String(number || "").trim(), "json");
  return raw && typeof raw === "object" ? (raw as InvoiceDocument) : null;
}

export function documentFromDraft(
  draft: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    amount: number;
    notes: string;
    billing: { street: string; city: string; state: string; zip: string };
    delivery: { street: string; city: string; state: string; zip: string };
  },
  extras: {
    number: string;
    company?: string;
    items?: LineItem[];
    warrantyKind?: "wwt" | "one-trip";
    banner?: string;
    date?: string;
    notes?: string[];
  },
): InvoiceDocument {
  const name = `${draft.firstName} ${draft.lastName}`.trim();
  const items = extras.items?.length ? extras.items : [{ title: draft.notes, qty: 1, unit: draft.amount }];
  const bill = [draft.billing.street, `${draft.billing.city}, ${draft.billing.state} ${draft.billing.zip}`];
  const ship = [draft.delivery.street, `${draft.delivery.city}, ${draft.delivery.state} ${draft.delivery.zip}`];
  const banner =
    extras.banner ||
    `${draft.notes} · ${draft.delivery.city}, ${draft.delivery.state}`.toUpperCase();
  return buildInvoiceDocument({
    number: extras.number,
    date: extras.date,
    banner,
    name,
    company: extras.company,
    email: draft.email,
    phone: draft.phone,
    billingLines: bill,
    shippingLines: ship,
    shipNote: `Buyer provides a clear, level, firm drop site with truck/trailer access and no overhead obstruction. Confirm ${draft.delivery.city}, ${draft.delivery.state} site access before dispatch.`,
    items,
    warrantyKind: extras.warrantyKind,
    notes: extras.notes,
    remittance: `After you send payment, email remittance confirmation so we can schedule ${draft.delivery.city}-area delivery.`,
  });
}
