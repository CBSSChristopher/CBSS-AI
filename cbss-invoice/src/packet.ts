import {
  BANK,
  BRAND,
  COMPANY,
  buildInvoiceDocument,
  escapeHtml,
  money,
  wireGross,
  type InvoiceDocument,
  type LineItem,
} from "./document.ts";

/** Confirmed Lufran ocean — Fiorella, 2026-08-27, quote 1858440. Do not use the $7,331.50 calculator dump. */
export const LUFRAN_LINES: LineItem[] = [
  { title: "Freight — 40' container", detail: "Minneapolis rail ramp to Tema Port, Ghana. 1 x 40HC shipper-owned container (SOC).", qty: 1, unit: 6950 },
  { title: "Bunker Adjustment Factor (BAF)", detail: "40' container fuel adjustment.", qty: 1, unit: 380 },
  { title: "Bill of lading", qty: 1, unit: 50 },
  { title: "Shipper’s declaration (over $2,500) on $5,000", qty: 1, unit: 50 },
  {
    title: "Lufran printed total",
    detail: "The four confirmed lines add to $7,430.00. Lufran’s email total was US $7,430.50 — this fifty cents matches their printed pay amount.",
    qty: 1,
    unit: 0.5,
  },
];

export const PALMER = {
  date: "August 29, 2026",
  cbssNumber: "CBS-2026-JP01",
  lufranNumber: "QUOTE-1858440",
  lufranQuote: "1858440",
  lufranConfirmed: "August 27, 2026",
  cbssTotal: 2300,
  lufranTotal: 7430.5,
  billTo: {
    name: "Jamie Palmer",
    email: "jamiedpalmer@yahoo.com",
    lines: [
      "Family billing address on file with Nathaniel Owusu",
      "7624 Coachlight Lane",
      "Ellicott City, MD 21043",
    ],
  },
  shipTo: {
    name: "Load site · Williston, ND",
    lines: [
      "15140 49 T Way NW",
      "Williston, ND 58801",
      "Destination: Tema Port, Ghana",
    ],
  },
  cargo: "Used kitchen appliances / washers / dryers · household goods",
  family: "Nathaniel “Nate” Owusu · nowus002@gmail.com",
};

export function palmerCbssItems(): LineItem[] {
  return [
    {
      title: "40HC cargo-worthy shipper-owned container (SOC) with depot / sea-worthy certificate",
      detail: "One 40' high cube, cargo-worthy, with the depot / sea-worthy certificate required for export.",
      qty: 1,
      unit: 2300,
    },
    {
      title: "Export logistics and container handling",
      detail:
        "CBSS handles the box for this family job: depot certificate, Williston load-site coordination, packing-list support, and booking support with Lufran International. Ocean freight is not on this line.",
      qty: 1,
      unit: 0,
    },
  ];
}

export function buildPalmerCbssDocument(): InvoiceDocument {
  return buildInvoiceDocument({
    number: PALMER.cbssNumber,
    date: PALMER.date,
    due: "Due on receipt — before the container is dispatched",
    banner: "40HC EXPORT SOC · WILLISTON, ND → TEMA, GHANA · LOGISTICS INCLUDED",
    name: PALMER.billTo.name,
    email: PALMER.billTo.email,
    phone: "",
    billingLines: PALMER.billTo.lines,
    shipName: PALMER.shipTo.name,
    shippingLines: PALMER.shipTo.lines,
    warrantyKind: "export-soc",
    items: palmerCbssItems(),
    notes: [
      `Pay CB Shipping Solutions ${money(PALMER.cbssTotal)} only. That is the container, the depot certificate, and CBSS logistics / handling.`,
      "Do not pay ocean freight to CBSS. The enclosed Lufran quote is paid to LUFRAN INTERNATIONAL on PayCargo.",
      `USD only. Put invoice ${PALMER.cbssNumber} in the payment memo / addenda.`,
      `Family contact on the job: ${PALMER.family}. Cargo: ${PALMER.cargo}.`,
    ],
    remittance: "After you send payment, email remittance confirmation so we can release the container and keep Lufran moving.",
    termsTitle: "EXPORT · LOAD SITE · TERMS",
    terms: [
      "Load site: 15140 49 T Way NW, Williston, ND 58801. Destination: Tema Port, Ghana.",
      "Family provides the packing list and the exact shipper, consignee, and notify names for the bill of lading. CBSS will help write those if needed.",
      "Williston must be ready for inspection, packing, and loading. Extra charges apply if the load site is not ready or if extra labor / equipment is required on site.",
      "Title transfers after CBSS funds clear. Ocean, destination charges, Ghana duties, and cargo insurance are billed by Lufran or at destination — not on this invoice.",
      "This packet rebuilds the August 26 / August 28 Owusu invoices to Jamie Palmer in the navy / gold brand. The old all-in invoice is superseded.",
    ],
  });
}

function header(docNo: string, date: string, due: string, label: string): string {
  const c = COMPANY;
  return `<header class="bar">
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
      <div class="inv-label">${escapeHtml(label)}</div>
      <div class="inv-no">${escapeHtml(docNo)}</div>
      <div class="fine">${escapeHtml(date)}</div>
      <div class="fine">${escapeHtml(due)}</div>
    </div>
  </header>
  <div class="goldrule"></div>`;
}

function partyBox(title: string, name: string, lines: string[], extra: string[] = []): string {
  const bits = [name ? `<strong>${escapeHtml(name)}</strong>` : "", ...lines, ...extra]
    .filter(Boolean)
    .map((line) => (line.startsWith("<strong>") ? line : escapeHtml(line)));
  return `<div class="party"><h3>${escapeHtml(title)}</h3><p>${bits.join("<br>")}</p></div>`;
}

function lineRows(items: LineItem[]): string {
  return items
    .map((item) => {
      const amount = Math.round(item.qty * item.unit * 100) / 100;
      return `<tr>
        <td>
          <div class="item-title">${escapeHtml(item.title)}</div>
          ${item.detail ? `<div class="item-detail">${escapeHtml(item.detail)}</div>` : ""}
        </td>
        <td class="num">${escapeHtml(String(item.qty))}</td>
        <td class="num">${item.unit === 0 ? "Included" : escapeHtml(money(item.unit))}</td>
        <td class="num">${item.unit === 0 ? "Included" : escapeHtml(money(amount))}</td>
      </tr>`;
    })
    .join("");
}

function footer(docNo: string, page: number, total: number): string {
  const c = COMPANY;
  return `<footer>
    <span>${escapeHtml(c.legal)} · ${escapeHtml(c.street)}, ${escapeHtml(c.cityMail)} · ${escapeHtml(c.phone)}</span>
    <span>${escapeHtml(docNo)} · Page ${page} of ${total}</span>
  </footer>`;
}

function packetCss(): string {
  const { navy, gold, cream, cream2, mint, mintInk, slate, ink, muted, sans, serif } = BRAND;
  return `
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
    .warn { background: ${navy}; color: #fff; }
    .warn h2 { color: ${gold}; }
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
    .kv { display: grid; grid-template-columns: 150px 1fr; gap: 2px 10px; font-size: 10.5px; }
    .kv span { color: ${gold}; font-weight: 700; }
    .kv strong { font-weight: 600; color: #fff; }
    .wire { background: ${navy}; color: #fff; border-radius: 10px; padding: 12px; margin: 0 0 12px; }
    .wire h2 { margin: 0 0 6px; color: ${gold}; font-size: 12px; letter-spacing: .06em; }
    .wire p { margin: 0 0 5px; }
    .swift { background: ${cream2}; border-radius: 10px; padding: 12px; margin: 0 0 12px; }
    .swift h2 { margin: 0 0 6px; color: ${gold}; font-size: 12px; letter-spacing: .06em; }
    .paygrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
    .paycard { border-radius: 8px; padding: 12px; min-height: 150px; }
    .paycard h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: .06em; }
    .paycard .amt { font: 700 22px/1.2 ${serif}; color: ${gold}; margin: 6px 0; }
    .navy { background: ${navy}; color: #fff; }
    .navy h2 { color: ${gold}; }
    .steps { margin: 0; padding-left: 18px; }
    .steps li { margin: 0 0 6px; }
    @media print { .noprint { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  `;
}

function kvRow(label: string, value: string): string {
  return `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function renderPalmerPacketHtml(): string {
  const doc = buildPalmerCbssDocument();
  const c = COMPANY;
  const b = BANK;
  const wire = wireGross(doc.total);
  const pages = 5;
  const packetId = `${PALMER.cbssNumber} / ${PALMER.lufranNumber}`;

  const cover = `<section class="page">
    ${header(packetId, PALMER.date, "Two payments · do not mix them", "PACKET")}
    <div class="banner">JAMIE PALMER · 40HC TO TEMA · WHO PAYS WHAT</div>
    <div class="parties">
      ${partyBox("FROM / SELLER", c.legal, [`d/b/a ${c.dba}`, c.street, c.cityLine, `EIN ${c.ein}`, c.phone])}
      ${partyBox("BILL TO", PALMER.billTo.name, PALMER.billTo.lines, [PALMER.billTo.email])}
      ${partyBox("LOAD / DESTINATION", PALMER.shipTo.name, PALMER.shipTo.lines, [PALMER.cargo])}
    </div>
    <div class="paygrid">
      <div class="paycard navy">
        <h2>INVOICE 1 · PAY CBSS NOW</h2>
        <p>Container, depot certificate, and CBSS logistics / handling the box.</p>
        <div class="amt">${escapeHtml(money(PALMER.cbssTotal))}</div>
        <p>Invoice ${escapeHtml(PALMER.cbssNumber)} · ACH or wire to CBGC LLC. Pages 2–3.</p>
        <p>Do not pay freight to CBSS.</p>
      </div>
      <div class="paycard cream">
        <h2>INVOICE 2 · PAY LUFRAN</h2>
        <p>Enclosed ocean quote — Lufran #${escapeHtml(PALMER.lufranQuote)}, confirmed ${escapeHtml(PALMER.lufranConfirmed)}.</p>
        <div class="amt" style="color:${BRAND.navy}">${escapeHtml(money(PALMER.lufranTotal))}</div>
        <p>PayCargo payee <strong>LUFRAN INTERNATIONAL</strong>. Pages 4–5.</p>
        <p>Do not send this amount to CBSS.</p>
      </div>
    </div>
    <div class="box mint">
      <h2>WHAT CBSS IS HANDLING ON THIS RUN</h2>
      <p>This rebuild bills Jamie Palmer, not Nathaniel Owusu as the primary. The $2,300.00 CBSS invoice now includes logistics and handling the container — not just the steel and the paper.</p>
      <ul class="steps">
        <li>Source and hold the 40HC cargo-worthy SOC and the depot / sea-worthy certificate.</li>
        <li>Coordinate the Williston, ND load site at 15140 49 T Way NW.</li>
        <li>Help with the packing list and the shipper / consignee / notify names for the bill of lading.</li>
        <li>Book and stay on Lufran International for Minneapolis rail ramp → Tema.</li>
      </ul>
      <p>Family contact on the job stays Nate Owusu (${escapeHtml("nowus002@gmail.com")}) so the load site does not go silent.</p>
    </div>
    <div class="box cream">
      <h2>WHAT IS NOT ON EITHER INVOICE</h2>
      <p>Ghana destination charges, duties, and taxes. Cargo insurance unless Lufran bills it later. Any extra on-site labor, crane, or equipment at Williston. The August 26 all-in invoice and the unconfirmed freight-calculator dump are both superseded.</p>
    </div>
    ${footer(packetId, 1, pages)}
  </section>`;

  const notes = doc.notes.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const warranty = doc.warranty.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const terms = doc.terms.map((line) => `<p>${escapeHtml(line)}</p>`).join("");

  const cbssFace = `<section class="page">
    ${header(doc.number, doc.date, doc.due, "INVOICE")}
    <div class="parties">
      ${partyBox("FROM / SELLER", c.legal, [`d/b/a ${c.dba}`, c.street, c.cityLine, `EIN ${c.ein}`, c.phone])}
      ${partyBox("BILL TO", doc.billTo.name, doc.billTo.lines, [doc.billTo.email || ""].filter(Boolean))}
      ${partyBox("SHIP TO", doc.shipTo.name, doc.shipTo.lines)}
    </div>
    <div class="banner">${escapeHtml(doc.banner)}</div>
    <table class="lines">
      <thead><tr><th>DESCRIPTION</th><th class="num">QTY</th><th class="num">UNIT PRICE</th><th class="num">AMOUNT</th></tr></thead>
      <tbody>${lineRows(doc.items)}</tbody>
    </table>
    <div class="split">
      <div class="notes"><h2 style="margin:0 0 6px;letter-spacing:.08em;font-size:11px">INVOICE NOTES</h2>${notes}</div>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${escapeHtml(money(doc.subtotal))}</span></div>
        <div class="row"><span>Tax</span><span>${escapeHtml(money(doc.tax))}</span></div>
        <div class="due"><span>TOTAL DUE CBSS</span><span>${escapeHtml(money(doc.total))}</span></div>
      </div>
    </div>
    <div class="box mint"><h2>${escapeHtml(doc.warrantyTitle)}</h2>${warranty}</div>
    <div class="box cream"><h2>${escapeHtml(doc.termsTitle)}</h2>${terms}</div>
    ${footer(doc.number, 2, pages)}
  </section>`;

  const cbssPay = `<section class="page">
    ${header(doc.number, doc.date, doc.due, "INVOICE")}
    <h1 class="pay">How to Pay CBSS</h1>
    <p class="lead">USD only. Memo / addenda: <strong>${escapeHtml(doc.number)}</strong>. This page is only the ${escapeHtml(money(doc.total))} CBSS invoice. Do not wire the Lufran ocean amount here.</p>
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
    </div>
    <div class="swift">
      <h2>INTERNATIONAL SWIFT · IF PAYING FROM OUTSIDE THE U.S.</h2>
      <p>Recipient: ${escapeHtml(b.recipient)} · ${escapeHtml(b.address)}, ${escapeHtml(b.cityZip)}, United States</p>
      <p>Account number: ${escapeHtml(b.account)} · Wire routing: ${escapeHtml(b.routing)}</p>
      <p>SWIFT / BIC: ${escapeHtml(b.swift)} · Intermediary BIC: ${escapeHtml(b.intermediary)}</p>
      <p>Bank: ${escapeHtml(b.swiftBank)}</p>
    </div>
    ${footer(doc.number, 3, pages)}
  </section>`;

  const lufranFace = `<section class="page">
    ${header(PALMER.lufranNumber, PALMER.date, "Pay Lufran — not CBSS", "ENCLOSED QUOTE")}
    <div class="banner">LUFRAN INTERNATIONAL · QUOTE #${escapeHtml(PALMER.lufranQuote)} · MINNEAPOLIS → TEMA</div>
    <div class="parties">
      ${partyBox("ISSUED THROUGH", c.legal, ["Enclosed ocean quote. CBSS is not the ocean carrier on this page."], ["Do not pay this amount to CBGC LLC."])}
      ${partyBox("BILL TO", PALMER.billTo.name, PALMER.billTo.lines, [PALMER.billTo.email])}
      ${partyBox("OCEAN LANE", "Lufran International", [
        "Quote #" + PALMER.lufranQuote,
        "Confirmed " + PALMER.lufranConfirmed,
        "1 x 40HC SOC",
        "Minneapolis rail ramp → Tema Port, Ghana",
      ])}
    </div>
    <table class="lines">
      <thead><tr><th>DESCRIPTION</th><th class="num">QTY</th><th class="num">UNIT PRICE</th><th class="num">AMOUNT</th></tr></thead>
      <tbody>${lineRows(LUFRAN_LINES)}</tbody>
    </table>
    <div class="split">
      <div class="notes">
        <h2 style="margin:0 0 6px;letter-spacing:.08em;font-size:11px">QUOTE NOTES</h2>
        <p>These lines are Lufran’s confirmed ocean for quote #${escapeHtml(PALMER.lufranQuote)} (Fiorella, ${escapeHtml(PALMER.lufranConfirmed)}). They replace the unconfirmed freight-calculator dump.</p>
        <p>Cargo: ${escapeHtml(PALMER.cargo)}. Weight basis on the confirmation: 10,000 lb / 4,535.97 kg.</p>
        <p>Vessels, dates, and transit times are estimates and subject to change. Destination charges may take up to five days to confirm and are not in this total.</p>
      </div>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${escapeHtml(money(PALMER.lufranTotal))}</span></div>
        <div class="row"><span>Tax</span><span>$0.00</span></div>
        <div class="due"><span>PAY LUFRAN</span><span>${escapeHtml(money(PALMER.lufranTotal))}</span></div>
      </div>
    </div>
    <div class="box warn">
      <h2>DO NOT PAY THIS AMOUNT TO CB SHIPPING SOLUTIONS</h2>
      <p>PayCargo payee is LUFRAN INTERNATIONAL. Wire only to LUFRAN INTERNATIONAL CORP. Send Lufran the payment confirmation after you pay.</p>
    </div>
    ${footer(PALMER.lufranNumber, 4, pages)}
  </section>`;

  const lufranPay = `<section class="page">
    ${header(PALMER.lufranNumber, PALMER.date, "Pay Lufran — not CBSS", "ENCLOSED QUOTE")}
    <h1 class="pay">How to Pay Lufran</h1>
    <p class="lead">This page is only the enclosed ocean quote of <strong>${escapeHtml(money(PALMER.lufranTotal))}</strong>. Do not send it to CBGC LLC / Lead Bank.</p>
    <div class="paybox">
      <div class="cap">PAYCARGO — PAYEE LUFRAN INTERNATIONAL</div>
      <div class="body">
        <p>Lufran accepts payment via PayCargo.</p>
        ${kvRow("Payee", "LUFRAN INTERNATIONAL")}
        ${kvRow("Amount", `${money(PALMER.lufranTotal)} USD`)}
        ${kvRow("Quote", `#${PALMER.lufranQuote}`)}
        ${kvRow("PayCargo", "https://paycargo.com/paycargo-quick-pay/")}
        ${kvRow("After you pay", "Email the confirmation to Fiorella at Lufran and copy CB Shipping Solutions")}
      </div>
    </div>
    <div class="wire">
      <h2>WIRE — LUFRAN INTERNATIONAL CORP ONLY</h2>
      <p>If you wire, pay only LUFRAN INTERNATIONAL CORP. Their banking is on Lufran’s own PDF, not on this CBSS page. We do not reprint another company’s bank account.</p>
      <p>Do not use the CBSS routing / account numbers from page 3 for this amount.</p>
    </div>
    <div class="box cream">
      <h2>AFTER BOTH PAYMENTS</h2>
      <ol class="steps">
        <li>Pay ${escapeHtml(money(PALMER.cbssTotal))} to CBSS on invoice ${escapeHtml(PALMER.cbssNumber)}.</li>
        <li>Pay ${escapeHtml(money(PALMER.lufranTotal))} to Lufran on quote #${escapeHtml(PALMER.lufranQuote)} and forward the confirmation.</li>
        <li>Confirm Williston is ready for inspection, packing, and loading.</li>
        <li>Send the packing list and the exact bill-of-lading names.</li>
      </ol>
    </div>
    ${footer(PALMER.lufranNumber, 5, pages)}
  </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Packet ${escapeHtml(PALMER.cbssNumber)} · Jamie Palmer</title>
  <style>${packetCss()}</style>
</head>
<body>
  ${cover}
  ${cbssFace}
  ${cbssPay}
  ${lufranFace}
  ${lufranPay}
</body>
</html>`;
}
