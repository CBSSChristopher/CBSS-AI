import { DEFAULT_CLOSER } from "./note.ts";
import { normalizeVaOutcome, type VaOutcome } from "./outcomes.ts";

export const VA_CAPTURE_PREFIX = "va:capture:";
export const VA_INDEX_KEY = "va:index";
const INDEX_CAP = 200;

export type VaSource = "elevenlabs" | "twilio" | "manual" | "facebook" | "unknown";

export type VaCapture = {
  id: string;
  receivedAt: string;
  source: VaSource;
  callId: string;
  conversationId: string;
  from: string;
  to: string;
  phone: string;
  contactId: string;
  contactName: string;
  outcome: VaOutcome | "";
  durationSec: number;
  transcript: string;
  summary: string;
  bookedAt: string;
  closer: string;
  crmFlushed: boolean;
  crmFlushAt: string;
  crmFlushError: string;
  skippedReason: string;
};

function captureKey(id: string): string {
  return VA_CAPTURE_PREFIX + String(id || "").trim();
}

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function emptyCapture(partial: Partial<VaCapture> = {}): VaCapture {
  const outcome = normalizeVaOutcome(partial.outcome) || (partial.outcome === "" ? "" : normalizeVaOutcome(partial.outcome));
  return {
    id: String(partial.id || "").trim() || randomId(),
    receivedAt: String(partial.receivedAt || "").trim() || new Date().toISOString(),
    source:
      partial.source === "elevenlabs" ||
      partial.source === "twilio" ||
      partial.source === "manual" ||
      partial.source === "facebook"
        ? partial.source
        : "unknown",
    callId: String(partial.callId || "").trim(),
    conversationId: String(partial.conversationId || "").trim(),
    from: String(partial.from || "").trim(),
    to: String(partial.to || "").trim(),
    phone: String(partial.phone || partial.from || "").trim(),
    contactId: String(partial.contactId || "").trim(),
    contactName: String(partial.contactName || "").trim(),
    outcome: outcome || "",
    durationSec: Number(partial.durationSec) || 0,
    transcript: String(partial.transcript || "").trim(),
    summary: String(partial.summary || "").trim(),
    bookedAt: String(partial.bookedAt || "").trim(),
    closer: String(partial.closer || "").trim() || DEFAULT_CLOSER,
    crmFlushed: Boolean(partial.crmFlushed),
    crmFlushAt: String(partial.crmFlushAt || "").trim(),
    crmFlushError: String(partial.crmFlushError || "").trim(),
    skippedReason: String(partial.skippedReason || "").trim(),
  };
}

export async function readVaIndex(env: { SESSIONS?: KVNamespace }): Promise<string[]> {
  if (!env.SESSIONS) return [];
  const raw = await env.SESSIONS.get(VA_INDEX_KEY, "json");
  return Array.isArray(raw) ? raw.map(String) : [];
}

export async function getVaCapture(env: { SESSIONS?: KVNamespace }, id: string): Promise<VaCapture | null> {
  if (!env.SESSIONS) return null;
  const raw = await env.SESSIONS.get(captureKey(id), "json");
  return raw && typeof raw === "object" ? emptyCapture(raw as Partial<VaCapture>) : null;
}

export async function putVaCapture(env: { SESSIONS?: KVNamespace }, capture: VaCapture): Promise<VaCapture> {
  const rec = emptyCapture(capture);
  if (!env.SESSIONS) return rec;
  await env.SESSIONS.put(captureKey(rec.id), JSON.stringify(rec));
  const index = await readVaIndex(env);
  const next = [rec.id, ...index.filter((id) => id !== rec.id)].slice(0, INDEX_CAP);
  await env.SESSIONS.put(VA_INDEX_KEY, JSON.stringify(next));
  return rec;
}

export async function listVaCaptures(env: { SESSIONS?: KVNamespace }, limit = 50): Promise<VaCapture[]> {
  const ids = (await readVaIndex(env)).slice(0, Math.max(1, Math.min(limit, INDEX_CAP)));
  const rows: VaCapture[] = [];
  for (const id of ids) {
    const rec = await getVaCapture(env, id);
    if (rec) rows.push(rec);
  }
  return rows;
}

export async function findCaptureByCall(env: { SESSIONS?: KVNamespace }, callId: string): Promise<VaCapture | null> {
  const want = String(callId || "").trim();
  if (!want) return null;
  const rows = await listVaCaptures(env, INDEX_CAP);
  return rows.find((row) => row.callId === want || row.conversationId === want || row.id === want) || null;
}
