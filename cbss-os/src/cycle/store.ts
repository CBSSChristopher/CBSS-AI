import type { ActiveUser } from "./rep.ts";
import type { Lifecycle } from "./lifecycle.ts";
import type { TemplateId } from "./templates.ts";

export const USERS_KEY = "cycle:users";
export const INDEX_KEY = "cycle:index";
export const ALERTS_PREFIX = "cycle:alerts:";
const RECORD_PREFIX = "cycle:rec:";

export type CteStep = "CTE1" | "CTE2" | "CTE3" | "CTE4";

export type SendRecord = {
  template: TemplateId;
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  dueAt?: string;
  sentAt?: string;
  failedAt?: string;
  error?: string;
  messageId?: string;
  threadId?: string;
  idempotencyKey?: string;
  attempts: number;
};

export type CycleEvent = {
  at: string;
  text: string;
  actor: string;
};

export type CycleRecord = {
  contactId: string;
  clientEmail: string;
  clientName: string;
  owner: string;
  ownerEmail: string;
  lifecycle: Lifecycle | "";
  cteStage: CteStep | "parked" | "";
  cte1Date: string;
  nextDue: string;
  stopped: boolean;
  stoppedReason: string;
  paused: boolean;
  pauseReason: string;
  overrideAt?: string;
  overrideBy?: string;
  overrideReason?: string;
  overrideFrom?: string;
  overrideTo?: string;
  sends: Partial<Record<TemplateId, SendRecord>>;
  threadIds: string[];
  messageIds: string[];
  events: CycleEvent[];
  updatedAt: string;
};

function recKey(id: string): string {
  return RECORD_PREFIX + String(id || "").trim();
}

export async function readUsers(env: { SESSIONS?: KVNamespace }): Promise<ActiveUser[]> {
  if (!env.SESSIONS) return [];
  const raw = await env.SESSIONS.get(USERS_KEY, "json");
  return Array.isArray(raw) ? (raw as ActiveUser[]) : [];
}

export async function rememberUser(env: { SESSIONS?: KVNamespace }, user: { email: string; name: string }): Promise<void> {
  if (!env.SESSIONS) return;
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return;
  const title = String(user.name || "").trim() || email;
  const rows = await readUsers(env);
  const next: ActiveUser = { email, name: title, title, lastLogin: new Date().toISOString() };
  const out = [next, ...rows.filter((row) => row.email !== email)].slice(0, 200);
  await env.SESSIONS.put(USERS_KEY, JSON.stringify(out));
}

export async function readIndex(env: { SESSIONS?: KVNamespace }): Promise<string[]> {
  if (!env.SESSIONS) return [];
  const raw = await env.SESSIONS.get(INDEX_KEY, "json");
  return Array.isArray(raw) ? raw.map(String) : [];
}

export async function writeIndex(env: { SESSIONS?: KVNamespace }, ids: string[]): Promise<void> {
  if (!env.SESSIONS) return;
  await env.SESSIONS.put(INDEX_KEY, JSON.stringify([...new Set(ids.map((id) => String(id).trim()).filter(Boolean))].slice(0, 4000)));
}

export function emptyRecord(contactId: string): CycleRecord {
  return {
    contactId: String(contactId),
    clientEmail: "",
    clientName: "",
    owner: "",
    ownerEmail: "",
    lifecycle: "",
    cteStage: "",
    cte1Date: "",
    nextDue: "",
    stopped: false,
    stoppedReason: "",
    paused: false,
    pauseReason: "",
    sends: {},
    threadIds: [],
    messageIds: [],
    events: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function readRecord(env: { SESSIONS?: KVNamespace }, contactId: string): Promise<CycleRecord | null> {
  if (!env.SESSIONS) return null;
  const raw = await env.SESSIONS.get(recKey(contactId), "json");
  return raw && typeof raw === "object" ? (raw as CycleRecord) : null;
}

export async function writeRecord(env: { SESSIONS?: KVNamespace }, rec: CycleRecord): Promise<void> {
  if (!env.SESSIONS) return;
  rec.updatedAt = new Date().toISOString();
  rec.events = (rec.events || []).slice(-80);
  await env.SESSIONS.put(recKey(rec.contactId), JSON.stringify(rec));
  const index = await readIndex(env);
  if (!index.includes(rec.contactId)) await writeIndex(env, [rec.contactId, ...index]);
}

export function pushEvent(rec: CycleRecord, text: string, actor: string): void {
  rec.events.unshift({ at: new Date().toISOString(), text, actor });
}

export async function readAlerts(env: { SESSIONS?: KVNamespace }, email: string): Promise<Array<{ at: string; text: string; contactId: string }>> {
  if (!env.SESSIONS) return [];
  const raw = await env.SESSIONS.get(ALERTS_PREFIX + email.toLowerCase(), "json");
  return Array.isArray(raw) ? raw : [];
}

export async function pushAlert(
  env: { SESSIONS?: KVNamespace },
  email: string,
  contactId: string,
  text: string,
): Promise<void> {
  if (!env.SESSIONS || !email) return;
  const rows = await readAlerts(env, email);
  rows.unshift({ at: new Date().toISOString(), contactId, text });
  await env.SESSIONS.put(ALERTS_PREFIX + email.toLowerCase(), JSON.stringify(rows.slice(0, 40)));
}

export async function recordsByThread(env: { SESSIONS?: KVNamespace }, threadId: string): Promise<CycleRecord[]> {
  const ids = await readIndex(env);
  const out: CycleRecord[] = [];
  for (const id of ids) {
    const rec = await readRecord(env, id);
    if (rec && rec.threadIds.includes(threadId)) out.push(rec);
  }
  return out;
}
