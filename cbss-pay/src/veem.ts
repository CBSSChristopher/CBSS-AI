const PROD_API = "https://api.veem.com";
const TOKEN_PAD_MS = 60_000;

export type PaymentDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amount: number;
  notes: string;
  city: string;
  state: string;
  zip: string;
  street: string;
};

export type PaymentCard = {
  id: number | null;
  status: string;
  amount: number;
  currency: string;
  email: string;
  name: string;
  notes: string;
  claimLink: string;
  timeCreated: string;
};

type TokenRow = { token: string; exp: number };
let tokenCache: TokenRow | null = null;

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

export function completeDraft(raw: Partial<PaymentDraft> & { name?: string; amountRaw?: string }): PaymentDraft | { error: string } {
  const fromName = raw.name ? splitName(raw.name) : { firstName: "", lastName: "" };
  const firstName = String(raw.firstName || fromName.firstName || "").trim();
  const lastName = String(raw.lastName || fromName.lastName || "").trim();
  const email = String(raw.email || "").trim().toLowerCase();
  const phone = parsePhone(String(raw.phone || ""));
  const amount = typeof raw.amount === "number" ? raw.amount : parseAmount(String(raw.amountRaw || ""));
  const notes = String(raw.notes || "").trim().slice(0, 128);
  const city = String(raw.city || "").trim();
  const state = String(raw.state || "").trim().toUpperCase();
  const zip = String(raw.zip || "").replace(/\D/g, "").slice(0, 5);
  const street = String(raw.street || "").trim();
  if (!firstName || !lastName) return { error: "Type the customer first and last name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Type the customer email." };
  if (phone.length !== 10) return { error: "Type a 10-digit US phone." };
  if (amount == null) return { error: "Type the exact dollar amount Christopher set. Do not invent one." };
  if (!notes) return { error: "Type what this payment is for." };
  if (!city || !/^[A-Z]{2}$/.test(state) || zip.length !== 5) {
    return { error: "Type city, two-letter state, and ZIP." };
  }
  return { firstName, lastName, email, phone, amount, notes, city, state, zip, street: street || "Delivery site" };
}

export function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function invoicePayload(draft: PaymentDraft, requestId: string): Record<string, unknown> {
  return {
    requestId,
    notes: draft.notes,
    amount: { number: draft.amount, currency: "USD" },
    payer: {
      type: "Personal",
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      phoneCountryCode: "+1",
      countryCode: "US",
      businessName: `${draft.firstName} ${draft.lastName}`,
      industry: "Consumer Services",
      subIndustry: "Other",
      business: {
        entity: "PersonalUse",
        address: {
          countryCode: "US",
          street: draft.street,
          city: draft.city,
          state: draft.state,
          postalCode: draft.zip,
        },
      },
    },
  };
}

export function parseInvoice(raw: unknown): PaymentCard | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const amountObj = rec.amount && typeof rec.amount === "object" ? (rec.amount as Record<string, unknown>) : {};
  const payer = rec.payer && typeof rec.payer === "object" ? (rec.payer as Record<string, unknown>) : {};
  const amount = Number(amountObj.number);
  if (!Number.isFinite(amount) || amount < 50) return null;
  const first = String(payer.firstName || "").trim();
  const last = String(payer.lastName || "").trim();
  const email = String(payer.email || "").trim();
  return {
    id: Number.isFinite(Number(rec.id)) ? Number(rec.id) : null,
    status: String(rec.status || "Sent"),
    amount,
    currency: String(amountObj.currency || "USD"),
    email,
    name: [first, last].filter(Boolean).join(" ") || email,
    notes: String(rec.notes || ""),
    claimLink: String(rec.claimLink || ""),
    timeCreated: String(rec.timeCreated || ""),
  };
}

export function invoiceRows(raw: unknown): PaymentCard[] {
  if (Array.isArray(raw)) return raw.map(parseInvoice).filter((row): row is PaymentCard => Boolean(row));
  if (!raw || typeof raw !== "object") return [];
  const rec = raw as Record<string, unknown>;
  for (const key of ["content", "invoices", "data", "items", "results"]) {
    if (Array.isArray(rec[key])) return invoiceRows(rec[key]);
  }
  const one = parseInvoice(raw);
  return one ? [one] : [];
}

export function formatPaymentCard(card: PaymentCard): string {
  const when = card.timeCreated ? ` Created ${card.timeCreated.replace("T", " ").replace(/\.\d+Z$/, " UTC")}.` : "";
  return [
    "VEEM PAYMENT REQUEST — not a CBSS quote",
    `${card.name}  ${card.email}  ${money(card.amount)} ${card.currency}  ${card.status}`,
    card.notes,
    card.claimLink ? `Pay link: ${card.claimLink}` : "Veem did not return a pay link. Open apps.veem.com and check.",
    `Invoice ${card.id || "pending"}.${when}`,
    "Copy the link. Send it from the company inbox or text. Do not invent a different amount.",
  ].join("\n");
}

function apiBase(env: Env): string {
  return String(env.VEEM_API_BASE || PROD_API).replace(/\/+$/, "");
}

export function veemReady(env: Env): boolean {
  return Boolean(env.VEEM_CLIENT_ID && env.VEEM_CLIENT_SECRET);
}

export function tokenError(raw: string): string {
  let desc = "";
  try {
    const parsed = JSON.parse(raw) as { error?: string; error_description?: string; message?: string };
    desc = String(parsed.error_description || parsed.message || parsed.error || "").trim();
  } catch {
    desc = String(raw || "").trim();
  }
  if (/restricted/i.test(desc) || /cannot generate tokens/i.test(desc)) {
    return "Veem says this account is restricted and cannot generate API tokens. Ask Veem support to enable API access on the CBGC LLC account.";
  }
  if (/invalid_client/i.test(desc) || /unauthorized/i.test(desc)) {
    return "Veem rejected the API keys. Check the Client ID and Secret in Settings > Integrations.";
  }
  return desc ? desc.slice(0, 240) : "Veem login failed. Check the API keys.";
}

async function getToken(env: Env, fetchImpl: typeof fetch): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = env.VEEM_CLIENT_ID || "";
  const secret = env.VEEM_CLIENT_SECRET || "";
  const basic = btoa(`${id}:${secret}`);
  const res = await fetchImpl(`${apiBase(env)}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=all",
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error("veem_token_http", res.status, raw.slice(0, 180));
    throw new Error(tokenError(raw));
  }
  let data: { access_token?: string; expires_in?: number } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error("Veem login did not return a token.");
  }
  const token = String(data.access_token || "");
  if (!token) throw new Error("Veem login did not return a token.");
  const exp = Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000 - TOKEN_PAD_MS;
  tokenCache = { token, exp };
  return token;
}

async function veemFetch(
  env: Env,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; body: unknown; text: string }> {
  const token = await getToken(env, fetchImpl);
  const requestId = crypto.randomUUID();
  const res = await fetchImpl(`${apiBase(env)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body, text };
}

function veemError(status: number, body: unknown, text: string): string {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msg = String(rec.message || rec.error || rec.errorMessage || "").trim();
  if (status === 401 || status === 403) return "Veem rejected the API keys. Christopher needs to generate them in Veem Settings > Integrations.";
  if (msg) return msg.slice(0, 240);
  return `Veem returned ${status}. ${text.slice(0, 120)}`.trim();
}

export async function createPayment(
  env: Env,
  draft: PaymentDraft,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; card: PaymentCard } | { ok: false; error: string }> {
  if (!veemReady(env)) {
    return {
      ok: false,
      error:
        "Veem is not connected yet. Christopher: in apps.veem.com go to Settings > Integrations > Connect Veem API, generate the Client ID and Secret, then add them to this Worker.",
    };
  }
  const requestId = crypto.randomUUID();
  try {
    const result = await veemFetch(
      env,
      "/veem/v1.2/invoices",
      { method: "POST", body: JSON.stringify(invoicePayload(draft, requestId)) },
      fetchImpl,
    );
    if (!result.ok) return { ok: false, error: veemError(result.status, result.body, result.text) };
    const card = parseInvoice(result.body);
    if (!card) return { ok: false, error: "Veem created something, but no pay link came back. Open apps.veem.com and check." };
    return { ok: true, card };
  } catch (err) {
    console.error("veem_create_error", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach Veem." };
  }
}

export async function listPayments(
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; cards: PaymentCard[] } | { ok: false; error: string }> {
  if (!veemReady(env)) return { ok: true, cards: [] };
  try {
    const result = await veemFetch(env, "/veem/v1.2/invoices", { method: "GET" }, fetchImpl);
    if (!result.ok) return { ok: false, error: veemError(result.status, result.body, result.text) };
    return { ok: true, cards: invoiceRows(result.body) };
  } catch (err) {
    console.error("veem_list_error", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: err instanceof Error ? err.message : "Could not list Veem invoices." };
  }
}

export async function cancelPayment(
  env: Env,
  invoiceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; card: PaymentCard | null } | { ok: false; error: string }> {
  if (!veemReady(env)) return { ok: false, error: "Veem is not connected yet." };
  const id = String(invoiceId || "").replace(/\D/g, "");
  if (!id) return { ok: false, error: "Missing invoice id." };
  try {
    const result = await veemFetch(env, `/veem/v1.2/invoices/${id}/cancel`, { method: "POST", body: "{}" }, fetchImpl);
    if (!result.ok) return { ok: false, error: veemError(result.status, result.body, result.text) };
    return { ok: true, card: parseInvoice(result.body) };
  } catch (err) {
    console.error("veem_cancel_error", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: "Could not cancel that Veem invoice." };
  }
}
