import { loginCrmTool, type Env } from "../auth.ts";
import { contactsFromCrmPayload, crmRequestWithCookie } from "./crm-client.ts";
import { buildVaEmailDraft } from "./draft.ts";
import { applyFlushResult, planVaFlush } from "./flush.ts";
import { verifyVaWebhook } from "./hmac.ts";
import { VA_NOTE_TAG } from "./note.ts";
import { parseVaWebhookPayload } from "./parse.ts";
import { dialGate, publicVaStatus, type VaEnvBits } from "./status.ts";
import {
  findCaptureByCall,
  listVaCaptures,
  putVaCapture,
  type VaCapture,
} from "./store.ts";

export type VaHandlerResult = { status: number; body: Record<string, unknown>; capture?: VaCapture };

export async function handleVaOutboundHook(env: Env, request: Request): Promise<VaHandlerResult> {
  const secret = String(env.VA_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return { status: 401, body: { error: "VA_WEBHOOK_SECRET is not set. Outbound VA is parked." } };
  }
  const raw = await request.text();
  const ok = await verifyVaWebhook(secret, request.headers, raw);
  if (!ok) return { status: 400, body: { error: "Bad webhook signature." } };
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return { status: 400, body: { error: "Bad JSON." } };
  }
  const parsed = parseVaWebhookPayload(payload);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const existing = await findCaptureByCall(env, parsed.capture.callId || parsed.capture.id);
  const capture = existing
    ? {
        ...parsed.capture,
        id: existing.id,
        receivedAt: existing.receivedAt,
        crmFlushed: existing.crmFlushed,
        crmFlushAt: existing.crmFlushAt,
        crmFlushError: existing.crmFlushError,
        skippedReason: existing.skippedReason,
      }
    : parsed.capture;
  const stored = await putVaCapture(env, capture);
  return { status: 200, body: { ok: true, id: stored.id, outcome: stored.outcome, flushed: stored.crmFlushed }, capture: stored };
}

export async function flushVaCaptures(
  env: Env,
  contacts: unknown,
  writeNote: (contactId: string, text: string) => Promise<boolean>,
  onlyId = "",
): Promise<{ flushed: number; skipped: number; errors: number; items: VaCapture[] }> {
  const rows = await listVaCaptures(env, 200);
  const want = String(onlyId || "").trim();
  const picked = want ? rows.filter((row) => row.id === want) : rows.filter((row) => !row.crmFlushed);
  let flushed = 0;
  let skipped = 0;
  let errors = 0;
  const items: VaCapture[] = [];
  for (const row of picked) {
    const plan = planVaFlush(row, contacts);
    if (plan.action === "skip") {
      const next = applyFlushResult(row, plan, false);
      await putVaCapture(env, next);
      skipped += 1;
      items.push(next);
      continue;
    }
    let wrote = false;
    let error = "";
    try {
      wrote = await writeNote(plan.contactId, plan.note);
      if (!wrote) error = "CRM note did not save.";
    } catch (err) {
      error = err instanceof Error ? err.message : "CRM note failed.";
    }
    const next = applyFlushResult(row, plan, wrote, error);
    await putVaCapture(env, next);
    if (wrote) flushed += 1;
    else errors += 1;
    items.push(next);
  }
  return { flushed, skipped, errors, items };
}

export async function maybeServiceFlush(env: Env, capture: VaCapture): Promise<VaCapture> {
  const email = String(env.VA_CRM_EMAIL || "").trim();
  const password = String(env.VA_CRM_PASSWORD || "").trim();
  if (!email || !password) return capture;
  const login = await loginCrmTool(env, email, password);
  if (!login.ok) {
    const next = { ...capture, crmFlushError: login.error };
    await putVaCapture(env, next);
    return next;
  }
  const book = await crmRequestWithCookie(env, login.cookie, { method: "GET", search: "?action=get&omitNotes=1" });
  const contacts = contactsFromCrmPayload(book.data);
  const result = await flushVaCaptures(env, contacts, async (contactId, text) => {
    const note = await crmRequestWithCookie(env, login.cookie, {
      body: {
        action: "appendNote",
        contactId,
        text,
        tag: VA_NOTE_TAG,
      },
    });
    return note.ok;
  }, capture.id);
  return result.items[0] || capture;
}

export function vaDraftResponse(body: Record<string, unknown>): VaHandlerResult {
  return { status: 200, body: { ok: true, sent: false, draft: buildVaEmailDraft(body) } };
}

export function vaDialResponse(env: VaEnvBits): VaHandlerResult {
  const gate = dialGate(env);
  return { status: gate.status, body: gate.body };
}

export function vaPublicStatus(env: VaEnvBits): Record<string, unknown> {
  return publicVaStatus(env);
}

export { listVaCaptures, contactsFromCrmPayload };
