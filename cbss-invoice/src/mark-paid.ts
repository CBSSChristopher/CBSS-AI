import { splitName, type InvoiceCard } from "./waave.ts";

export const LIST_KEY = "invoices";
export const NEXT_STEPS_PDF_NAME = "CBSS-Next-Steps-After-Your-Order.pdf";
export const NEXT_STEPS_RETRY_ERROR = "Paid but Next Steps notify failed — retry";
export const NEXT_STEPS_UNCONFIGURED_ERROR =
  "Paid. Next Steps email is not configured. Set AGENTMAIL_API_KEY on this Worker (inbox cbss@agentmail.to).";
export const NEXT_STEPS_SUBJECT = "Next steps for your CB Shipping Solutions order";
export const AGENTMAIL_API = "https://api.agentmail.to/v0";
export const DEFAULT_INBOX = "cbss@agentmail.to";

export function paidNextStepsBody(firstName: string): string {
  const first = String(firstName || "").trim() || "there";
  return [
    `Hi ${first},`,
    "",
    "Thank you — we've received your payment and your order is moving forward.",
    "",
    "Attached is a short guide on what happens next (quality check and release, driver scheduling, and how we confirm your delivery window with you). Please read it before planning anyone on-site.",
    "",
    "Your sales representative remains your first point of contact. We'll be in touch with delivery timing once the depot confirms release.",
    "",
    "Thank you for your business,",
    "CB Shipping Solutions",
    "https://cbshippingsolutions.app/",
  ].join("\n");
}

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

export function paidAlreadySent(card: InvoiceCard): boolean {
  return Boolean(card.nextStepsEmailSentAt || card.nextStepsWebhookSentAt);
}

export async function loadNextStepsPdf(
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ filename: string; contentType: string; content: string } | null> {
  const url = String(env.NEXT_STEPS_PDF_URL || "").trim();
  if (!url) return null;
  const res = await fetchImpl(url);
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { filename: NEXT_STEPS_PDF_NAME, contentType: "application/pdf", content: btoa(bin) };
}

function officeCc(...emails: string[]): string[] {
  const host = "cbshippingsolutions.com";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const mail of [`christopher@${host}`, `aliyah@${host}`, ...emails.map((v) => String(v || "").trim().toLowerCase())]) {
    if (!mail || !mail.includes("@") || seen.has(mail)) continue;
    seen.add(mail);
    out.push(mail);
  }
  return out;
}

export async function sendPaidNextSteps(
  env: Env,
  card: InvoiceCard,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; messageId: string; attached: boolean } | { ok: false; error: string }> {
  const key = String(env.AGENTMAIL_API_KEY || "").trim();
  if (!key) return { ok: false, error: NEXT_STEPS_UNCONFIGURED_ERROR };
  const to = String(card.email || "").trim().toLowerCase();
  if (!to) return { ok: false, error: "Paid. No client email — pause, do not send." };
  const inbox = String(env.AGENTMAIL_INBOX || DEFAULT_INBOX).trim() || DEFAULT_INBOX;
  const first = firstNameFromCard(card);
  const pdfUrl = String(env.NEXT_STEPS_PDF_URL || "").trim();
  const pdf = pdfUrl ? null : await loadNextStepsPdf(env, fetchImpl);
  const currentRep = String(card.sentBy || card.paidBy || "").trim().toLowerCase();
  const payload: Record<string, unknown> = {
    to: [to],
    cc: officeCc(card.sentBy || "", card.paidBy || ""),
    reply_to: currentRep ? [currentRep] : undefined,
    subject: NEXT_STEPS_SUBJECT,
    text: paidNextStepsBody(first),
    labels: ["yard-cycle", "paid"],
  };
  if (pdfUrl) {
    payload.attachments = [{ filename: NEXT_STEPS_PDF_NAME, content_type: "application/pdf", url: pdfUrl, content_disposition: "attachment" }];
  } else if (pdf) {
    payload.attachments = [{ filename: pdf.filename, content_type: pdf.contentType, content: pdf.content, content_disposition: "attachment" }];
  }
  let lastError = "AgentMail send did not run.";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(`${AGENTMAIL_API}/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? JSON.parse(text) as Record<string, unknown> : {};
      } catch {
        body = {};
      }
      const messageId = String(body.message_id || body.messageId || "").trim();
      if (res.ok && messageId) return { ok: true, messageId, attached: Boolean(pdfUrl || pdf) };
      lastError = String(body.error || body.message || text || `AgentMail ${res.status}`).slice(0, 240);
      const transient = res.status === 408 || res.status === 409 || res.status === 429 || res.status >= 500;
      if (!transient) return { ok: false, error: lastError };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Could not reach AgentMail.";
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  return { ok: false, error: lastError };
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

  if (isPaidCard(found) && paidAlreadySent(found)) {
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

  if (!String(env.AGENTMAIL_API_KEY || "").trim()) {
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

  try {
    const mailed = await sendPaidNextSteps(env, paid, fetchImpl);
    if (mailed.ok) {
      const queued: InvoiceCard = {
        ...paid,
        nextStepsEmailSentAt: new Date().toISOString(),
        nextStepsWebhookSentAt: new Date().toISOString(),
      };
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
    console.error("next_steps_agentmail_error", mailed.error);
  } catch (err) {
    console.error("next_steps_agentmail_error", err instanceof Error ? err.message : "unknown");
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
