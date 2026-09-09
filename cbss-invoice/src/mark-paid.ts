import { splitName, type InvoiceCard } from "./waave.ts";

export const LIST_KEY = "invoices";
export const NEXT_STEPS_SIGNATURE_HEADER = "X-Webhook-Signature";
export const NEXT_STEPS_RETRY_ERROR = "Paid but Next Steps notify failed — retry";
export const NEXT_STEPS_UNCONFIGURED_ERROR =
  'Paid. Next Steps notify is not configured. Set NEXT_STEPS_WEBHOOK_URL from the Master Chief routine panel "Yard paid → Next Steps email".';

export type NextStepsPayload = {
  invoiceId: string;
  number: string;
  clientEmail: string;
  clientName: string;
  firstName: string;
  repEmail: string;
  paidAt: string;
  nextStepsAlreadySent: boolean;
};

export type MarkPaidResult = {
  ok: boolean;
  paid: boolean;
  nextStepsQueued: boolean;
  webhookFired: boolean;
  alreadyPaid: boolean;
  card?: InvoiceCard;
  error?: string;
};

export function isPaidCard(card: Pick<InvoiceCard, "status"> | null | undefined): boolean {
  return String(card?.status || "").trim().toLowerCase() === "paid";
}

export function invoiceLookupKeys(card: InvoiceCard): string[] {
  return [card.id, card.documentNumber, card.referenceId]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function cardMatchesId(card: InvoiceCard, raw: string): boolean {
  const needle = String(raw || "").trim().toLowerCase();
  if (!needle) return false;
  return invoiceLookupKeys(card).some((key) => key.toLowerCase() === needle);
}

export function cardRef(card: InvoiceCard): string {
  return String(card.documentNumber || card.referenceId || card.id || "").trim();
}

export async function readInvoiceCards(env: Env): Promise<InvoiceCard[]> {
  if (!env.INVOICE_STORE) return [];
  const raw = await env.INVOICE_STORE.get(LIST_KEY, "json");
  return Array.isArray(raw) ? (raw as InvoiceCard[]) : [];
}

export async function writeInvoiceCards(env: Env, rows: InvoiceCard[]): Promise<void> {
  if (!env.INVOICE_STORE) return;
  await env.INVOICE_STORE.put(LIST_KEY, JSON.stringify(rows.slice(0, 200)));
}

export function findInvoiceCard(cards: InvoiceCard[], raw: string): InvoiceCard | null {
  const needle = String(raw || "").trim();
  if (!needle) return null;
  return cards.find((card) => cardMatchesId(card, needle)) || null;
}

export function firstNameFromCard(card: InvoiceCard): string {
  const fromName = splitName(card.name).firstName;
  return fromName || String(card.name || "").trim().split(/\s+/)[0] || "";
}

export function buildNextStepsPayload(card: InvoiceCard, alreadySent: boolean): NextStepsPayload {
  return {
    invoiceId: String(card.id || "").trim(),
    number: cardRef(card),
    clientEmail: String(card.email || "").trim().toLowerCase(),
    clientName: String(card.name || "").trim(),
    firstName: firstNameFromCard(card),
    repEmail: String(card.paidBy || "").trim().toLowerCase(),
    paidAt: String(card.paidAt || "").trim(),
    nextStepsAlreadySent: Boolean(alreadySent),
  };
}

export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function nextStepsHeaders(env: Env, body: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "cbssinvoice/mark-paid",
  };
  const secret = String(env.NEXT_STEPS_WEBHOOK_SECRET || "").trim();
  if (secret) {
    headers[NEXT_STEPS_SIGNATURE_HEADER] = `sha256=${await hmacSha256Hex(secret, body)}`;
  }
  return headers;
}

function persistPaid(card: InvoiceCard, repEmail: string, paidAt: string): InvoiceCard {
  return {
    ...card,
    status: "paid",
    paidAt: card.paidAt || paidAt,
    paidBy: card.paidBy || String(repEmail || "").trim().toLowerCase(),
  };
}

export async function markPaidAndNotify(
  env: Env,
  idOrNumber: string,
  repEmail: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MarkPaidResult> {
  const id = String(idOrNumber || "").trim();
  if (!id) return { ok: false, paid: false, nextStepsQueued: false, webhookFired: false, alreadyPaid: false, error: "Missing invoice id." };
  if (!env.INVOICE_STORE) {
    return { ok: false, paid: false, nextStepsQueued: false, webhookFired: false, alreadyPaid: false, error: "Invoice store is not connected." };
  }

  const cards = await readInvoiceCards(env);
  const found = findInvoiceCard(cards, id);
  if (!found) {
    return { ok: false, paid: false, nextStepsQueued: false, webhookFired: false, alreadyPaid: false, error: "Invoice not found." };
  }

  if (isPaidCard(found) && found.nextStepsWebhookSentAt) {
    return {
      ok: true,
      paid: true,
      nextStepsQueued: true,
      webhookFired: false,
      alreadyPaid: true,
      card: found,
    };
  }

  const paid = persistPaid(found, repEmail, new Date().toISOString());
  const next = cards.map((row) => (cardMatchesId(row, id) ? paid : row));
  await writeInvoiceCards(env, next);

  const webhookUrl = String(env.NEXT_STEPS_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return {
      ok: false,
      paid: true,
      nextStepsQueued: false,
      webhookFired: false,
      alreadyPaid: isPaidCard(found),
      card: paid,
      error: NEXT_STEPS_UNCONFIGURED_ERROR,
    };
  }

  const payload = buildNextStepsPayload(paid, false);
  const body = JSON.stringify(payload);
  try {
    const res = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: await nextStepsHeaders(env, body),
      body,
    });
    if (res.ok) {
      const queued: InvoiceCard = { ...paid, nextStepsWebhookSentAt: new Date().toISOString() };
      await writeInvoiceCards(
        env,
        (await readInvoiceCards(env)).map((row) => (cardMatchesId(row, id) ? queued : row)),
      );
      return {
        ok: true,
        paid: true,
        nextStepsQueued: true,
        webhookFired: true,
        alreadyPaid: isPaidCard(found),
        card: queued,
      };
    }
  } catch (err) {
    console.error("next_steps_webhook_error", err instanceof Error ? err.message : "unknown");
  }

  return {
    ok: false,
    paid: true,
    nextStepsQueued: false,
    webhookFired: false,
    alreadyPaid: isPaidCard(found),
    card: paid,
    error: NEXT_STEPS_RETRY_ERROR,
  };
}
