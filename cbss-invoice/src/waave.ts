const PROD_API = "https://pg.getwaave.co";
const TX_PATH = "/waavepay/api/transaction";
const CREATE_PATHS = [TX_PATH];
const LIST_KEY = "invoices";

export type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type InvoiceDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amount: number;
  notes: string;
  billing: Address;
  delivery: Address;
};

export type InvoiceInput = Partial<InvoiceDraft> & {
  name?: string;
  amountRaw?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  deliveryStreet?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  sameAsBilling?: boolean;
};

export type InvoiceCard = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  email: string;
  name: string;
  notes: string;
  payLink: string;
  gmailLink: string;
  referenceId: string;
  timeCreated: string;
  emailedByWaave: boolean;
  sentBy: string;
  ccEmails: string[];
  billing?: Address;
  delivery?: Address;
};

export function parseAmount(raw: string): number | null {
  const clean = String(raw || "").replace(/[$,\s]/g, "");
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100) / 100;
  if (cents < 50 || cents > 100000) return null;
  return cents;
}

export function parsePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function splitName(raw: string): { firstName: string; lastName: string } {
  const parts = String(raw || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseAddress(
  raw: { street?: string; city?: string; state?: string; zip?: string } | undefined,
  label: string,
): Address | { error: string } {
  const street = String(raw?.street || "").trim().slice(0, 120);
  const city = String(raw?.city || "").trim().slice(0, 80);
  const state = String(raw?.state || "").trim().toUpperCase();
  const zip = String(raw?.zip || "").replace(/\D/g, "").slice(0, 5);
  if (!street || !city || !/^[A-Z]{2}$/.test(state) || zip.length !== 5) {
    return { error: `Type the ${label} street, city, two-letter state, and ZIP.` };
  }
  return { street, city, state, zip };
}

export function formatAddress(addr?: Address | null): string {
  if (!addr?.city || !addr.state || !addr.zip) return "";
  return [addr.street, addr.city, `${addr.state} ${addr.zip}`].filter(Boolean).join(", ");
}

export function completeDraft(raw: InvoiceInput): InvoiceDraft | { error: string } {
  const fromName = raw.name ? splitName(raw.name) : { firstName: "", lastName: "" };
  const firstName = String(raw.firstName || fromName.firstName || "").trim();
  const lastName = String(raw.lastName || fromName.lastName || "").trim();
  const email = String(raw.email || "").trim().toLowerCase();
  const phone = parsePhone(String(raw.phone || ""));
  const amount = typeof raw.amount === "number" ? raw.amount : parseAmount(String(raw.amountRaw || ""));
  const notes = String(raw.notes || "").trim().slice(0, 160);
  if (!firstName || !lastName) return { error: "Type the customer first and last name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Type the customer email." };
  if (phone.length !== 10) return { error: "Type a 10-digit US phone." };
  if (amount == null) return { error: "Type the exact dollar amount Christopher set. Do not invent one." };
  if (!notes) return { error: "Type what this invoice is for." };
  const billing = parseAddress(
    raw.billing || {
      street: raw.billingStreet || raw.street,
      city: raw.billingCity || raw.city,
      state: raw.billingState || raw.state,
      zip: raw.billingZip || raw.zip,
    },
    "billing",
  );
  if ("error" in billing) return billing;
  const delivery = raw.sameAsBilling
    ? billing
    : parseAddress(
        raw.delivery || {
          street: raw.deliveryStreet,
          city: raw.deliveryCity,
          state: raw.deliveryState,
          zip: raw.deliveryZip,
        },
        "delivery",
      );
  if ("error" in delivery) return delivery;
  return { firstName, lastName, email, phone, amount, notes, billing, delivery };
}

export function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function apiBase(env: Env): string {
  return String(env.WAAVE_API_BASE || PROD_API).replace(/\/+$/, "");
}

export function waaveReady(env: Env): boolean {
  return Boolean(env.WAAVE_API_KEY && env.WAAVE_API_SECRET && env.WAAVE_VENUE_ID);
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function waaveSignature(secret: string, url: string, body: string): Promise<string> {
  return sha256Hex(`${secret}${url}${body}`);
}

const COMPANY_HOST = ["cbshipping", "solutions.com"].join("");
const ALWAYS_CC_LOCALS = ["christopher", "aliyah"];

export function companyMail(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const local = raw.includes("@") ? raw.split("@")[0] : raw;
  const host = raw.includes("@") ? raw.split("@")[1] : COMPANY_HOST;
  if (!local || host !== COMPANY_HOST) return "";
  return `${local}@${COMPANY_HOST}`;
}

export function invoiceCopyEmails(senderEmail: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const mail = companyMail(raw);
    if (!mail || seen.has(mail)) return;
    seen.add(mail);
    out.push(mail);
  };
  for (const local of ALWAYS_CC_LOCALS) add(local);
  add(senderEmail);
  return out;
}

function addressBlock(addr: Address): Record<string, string> {
  return {
    address_1: addr.street,
    city: addr.city,
    state: addr.state,
    postcode: addr.zip,
    country: "US",
  };
}

export function invoicePayload(
  draft: InvoiceDraft,
  venueId: string,
  origin: string,
  senderEmail = "",
): Record<string, unknown> {
  const referenceId = String(Date.now());
  const ccEmails = invoiceCopyEmails(senderEmail);
  const billing = addressBlock(draft.billing);
  const shipping = addressBlock(draft.delivery);
  const description = [
    draft.notes,
    `Billing: ${formatAddress(draft.billing)}`,
    `Delivery: ${formatAddress(draft.delivery)}`,
  ].join(" · ");
  return {
    venue_id: venueId,
    amount: draft.amount,
    currency: "USD",
    reference_id: referenceId,
    return_url: `${origin}/paid`,
    cancel_url: `${origin}/`,
    description,
    notes: description,
    email: draft.email,
    customer_email: draft.email,
    first_name: draft.firstName,
    last_name: draft.lastName,
    phone: draft.phone,
    phone_code: "+1",
    send_email: true,
    channel: "email",
    cc: ccEmails,
    cc_emails: ccEmails,
    copies: ccEmails,
    sent_by: companyMail(senderEmail),
    customer: {
      email: draft.email,
      first_name: draft.firstName,
      last_name: draft.lastName,
      phone: draft.phone,
      ...billing,
    },
    billing_address: billing,
    shipping_address: shipping,
    delivery_address: shipping,
  };
}

export function pickString(rec: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function payLinkFrom(raw: Record<string, unknown>, id: string, base: string): string {
  const direct = pickString(raw, [
    "payment_url",
    "checkout_url",
    "pay_url",
    "payLink",
    "claimLink",
    "url",
    "link",
    "invoice_url",
  ]);
  if (direct) return direct;
  if (!id) return "";
  return `${base.replace(/\/+$/, "")}/pay/${id}`;
}

export function gmailDraft(
  to: string,
  name: string,
  amount: number,
  payLink: string,
  notes: string,
  ccEmails: string[] = [],
  billing = "",
  delivery = "",
): string {
  const subject = `CBShippingSolutions invoice ${money(amount)}`;
  const copies = ccEmails.filter(Boolean);
  const body = [
    `Hi ${name.split(" ")[0] || "there"},`,
    "",
    `Invoice for ${notes}. Amount due: ${money(amount)} USD.`,
    "Pay with the WAAVE link below. This is the invoice amount already set — not a new quote.",
    billing ? `Billing: ${billing}` : "",
    delivery ? `Delivery: ${delivery}` : "",
    "",
    payLink,
    "",
    copies.length ? `Office copy: ${copies.join(", ")}` : "",
    "CBGC LLC DBA CBShippingSolutions",
  ]
    .filter((line, i, arr) => line || (i && arr[i - 1]))
    .join("\n");
  let url =
    "https://mail.google.com/mail/?view=cm&fs=1&to=" +
    encodeURIComponent(to) +
    "&su=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);
  if (copies.length) url += "&cc=" + encodeURIComponent(copies.join(","));
  return url;
}

export function withInvoiceCopies(card: InvoiceCard, senderEmail: string): InvoiceCard {
  const ccEmails = card.ccEmails?.length ? card.ccEmails : invoiceCopyEmails(senderEmail);
  const sentBy = card.sentBy || companyMail(senderEmail);
  return {
    ...card,
    sentBy,
    ccEmails,
    gmailLink:
      card.email && card.payLink
        ? gmailDraft(
            card.email,
            card.name,
            card.amount,
            card.payLink,
            card.notes,
            ccEmails,
            formatAddress(card.billing),
            formatAddress(card.delivery),
          )
        : card.gmailLink,
  };
}

export function parseInvoice(raw: unknown, draft?: InvoiceDraft, base = PROD_API): InvoiceCard | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const nested =
    rec.data && typeof rec.data === "object"
      ? (rec.data as Record<string, unknown>)
      : rec.transaction && typeof rec.transaction === "object"
        ? (rec.transaction as Record<string, unknown>)
        : rec;
  const amount = Number(nested.amount ?? rec.amount);
  if (!Number.isFinite(amount) || amount < 50) return null;
  const id = String(nested.id || rec.id || rec.transaction_id || "").trim();
  const email = String(nested.email || rec.email || rec.customer_email || draft?.email || "").trim();
  const name =
    [nested.first_name || rec.first_name, nested.last_name || rec.last_name].filter(Boolean).join(" ").trim() ||
    (draft ? `${draft.firstName} ${draft.lastName}` : email);
  const notes = String(nested.description || nested.notes || rec.notes || draft?.notes || "").trim();
  const payLink = payLinkFrom({ ...rec, ...nested }, id, base);
  const emailedByWaave = Boolean(nested.email_sent || rec.email_sent || nested.sent || rec.sent);
  return {
    id,
    status: String(nested.status || rec.status || "sent"),
    amount,
    currency: String(nested.currency || rec.currency || "USD"),
    email,
    name,
    notes,
    payLink,
    gmailLink: email && payLink ? gmailDraft(email, name, amount, payLink, notes, [], formatAddress(draft?.billing), formatAddress(draft?.delivery)) : "",
    referenceId: String(nested.reference_id || rec.reference_id || ""),
    timeCreated: String(nested.created_at || rec.created_at || new Date().toISOString()),
    emailedByWaave,
    sentBy: "",
    ccEmails: [],
    billing: draft?.billing,
    delivery: draft?.delivery,
  };
}

export function formatInvoiceCard(card: InvoiceCard): string {
  const when = card.timeCreated ? ` Created ${card.timeCreated.replace("T", " ").replace(/\.\d+Z$/, " UTC")}.` : "";
  return [
    "WAAVE INVOICE — not a CBSS quote",
    `${card.name}  ${card.email}  ${money(card.amount)} ${card.currency}  ${card.status}`,
    card.notes,
    formatAddress(card.billing) ? `Billing: ${formatAddress(card.billing)}` : "",
    formatAddress(card.delivery) ? `Delivery: ${formatAddress(card.delivery)}` : "",
    card.payLink ? `Pay link: ${card.payLink}` : "WAAVE did not return a pay link. Open the WAAVE merchant dashboard and check.",
    card.emailedByWaave
      ? "WAAVE emailed the customer the payment request."
      : "Open Gmail from this tool and send the pay link from the company inbox. This tool does not send from Gmail.",
    card.ccEmails?.length ? `CC: ${card.ccEmails.join(", ")}` : "",
    `Invoice ${card.id || "pending"}.${when}`,
    "Do not invent a different amount.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function waaveFetch(
  env: Env,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; body: unknown; text: string; url: string }> {
  const body = typeof init.body === "string" ? init.body : "";
  const url = `${apiBase(env)}${path}`;
  const signature = await waaveSignature(env.WAAVE_API_SECRET || "", url, body);
  const res = await fetchImpl(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": env.WAAVE_API_KEY || "",
      "X-Api-Signature": signature,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { ok: res.ok, status: res.status, body: parsed, text, url };
}

function waaveError(status: number, body: unknown, text: string): string {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msg = String(rec.message || rec.error || rec.errorMessage || "").trim();
  if (/signature/i.test(msg)) return "WAAVE rejected the API signature. Check the secret key and venue id.";
  if (status === 401 || status === 403) {
    return "WAAVE rejected the API keys. Christopher: add the public key, secret key, and venue id from the WAAVE merchant dashboard.";
  }
  if (msg) return msg.slice(0, 240);
  return `WAAVE returned ${status}. ${text.slice(0, 120)}`.trim();
}

async function readStore(env: Env): Promise<InvoiceCard[]> {
  if (!env.INVOICE_STORE) return [];
  const raw = await env.INVOICE_STORE.get(LIST_KEY, "json");
  return Array.isArray(raw) ? (raw as InvoiceCard[]) : [];
}

async function writeStore(env: Env, rows: InvoiceCard[]): Promise<void> {
  if (!env.INVOICE_STORE) return;
  await env.INVOICE_STORE.put(LIST_KEY, JSON.stringify(rows.slice(0, 200)));
}

export async function rememberInvoice(env: Env, card: InvoiceCard): Promise<void> {
  const rows = await readStore(env);
  const next = [card, ...rows.filter((row) => row.id !== card.id)];
  await writeStore(env, next);
}

export async function createInvoice(
  env: Env,
  draft: InvoiceDraft,
  origin: string,
  senderEmail = "",
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; card: InvoiceCard } | { ok: false; error: string }> {
  if (!waaveReady(env)) {
    return {
      ok: false,
      error:
        "WAAVE is not connected yet. Christopher: from the WAAVE merchant dashboard copy the public/access key, secret key, and venue id, then add WAAVE_API_KEY, WAAVE_API_SECRET, and WAAVE_VENUE_ID on this Worker.",
    };
  }
  const payload = invoicePayload(draft, String(env.WAAVE_VENUE_ID || ""), origin, senderEmail);
  const body = JSON.stringify(payload);
  let lastError = "WAAVE did not accept the invoice create.";
  try {
    for (const path of CREATE_PATHS) {
      const result = await waaveFetch(env, path, { method: "POST", body }, fetchImpl);
      if (!result.ok) {
        lastError = waaveError(result.status, result.body, result.text);
        if (result.status === 404 || result.status === 405) continue;
        if (result.status >= 500) continue;
        return { ok: false, error: lastError };
      }
      const parsed = parseInvoice(result.body, draft, apiBase(env));
      if (!parsed || !parsed.payLink) {
        lastError = "WAAVE created something, but no pay link came back. Open the WAAVE merchant dashboard and check.";
        continue;
      }
      const card = withInvoiceCopies(parsed, senderEmail);
      await rememberInvoice(env, card);
      return { ok: true, card };
    }
    return { ok: false, error: lastError };
  } catch (err) {
    console.error("waave_create_error", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach WAAVE." };
  }
}

export async function listInvoices(
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; cards: InvoiceCard[] } | { ok: false; error: string }> {
  const stored = await readStore(env);
  if (!waaveReady(env) || !stored.length) return { ok: true, cards: stored };
  const refreshed: InvoiceCard[] = [];
  for (const row of stored.slice(0, 20)) {
    if (!row.id) {
      refreshed.push(row);
      continue;
    }
    try {
      const result = await waaveFetch(env, `${TX_PATH}/${row.id}`, { method: "GET" }, fetchImpl);
      if (!result.ok) {
        refreshed.push(row);
        continue;
      }
      const next = parseInvoice(result.body, undefined, apiBase(env));
      if (!next) {
        refreshed.push(row);
        continue;
      }
      const merged = {
        ...row,
        ...next,
        payLink: next.payLink || row.payLink,
        sentBy: row.sentBy || next.sentBy,
        ccEmails: row.ccEmails?.length ? row.ccEmails : next.ccEmails,
        billing: row.billing || next.billing,
        delivery: row.delivery || next.delivery,
      };
      refreshed.push(withInvoiceCopies(merged, merged.sentBy));
    } catch {
      refreshed.push(row);
    }
  }
  const rest = stored.slice(20);
  const cards = [...refreshed, ...rest];
  await writeStore(env, cards);
  return { ok: true, cards };
}

export async function cancelInvoice(
  env: Env,
  invoiceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; card: InvoiceCard | null } | { ok: false; error: string }> {
  if (!waaveReady(env)) return { ok: false, error: "WAAVE is not connected yet." };
  const id = String(invoiceId || "").trim();
  if (!id) return { ok: false, error: "Missing invoice id." };
  try {
    const result = await waaveFetch(env, `${TX_PATH}/${id}/cancel`, { method: "PUT", body: "" }, fetchImpl);
    if (!result.ok) return { ok: false, error: waaveError(result.status, result.body, result.text) };
    const rows = await readStore(env);
    const card = parseInvoice(result.body, undefined, apiBase(env));
    const next = rows.map((row) => (row.id === id ? { ...row, status: "canceled", ...(card || {}) } : row));
    await writeStore(env, next);
    return { ok: true, card: next.find((row) => row.id === id) || card };
  } catch (err) {
    console.error("waave_cancel_error", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: "Could not cancel that WAAVE invoice." };
  }
}

export function notConnectedMessage(): string {
  return "WAAVE is not connected yet. Christopher: in the WAAVE merchant dashboard copy the public/access key, secret key, and venue id, then add them on this Worker as WAAVE_API_KEY, WAAVE_API_SECRET, and WAAVE_VENUE_ID.";
}
