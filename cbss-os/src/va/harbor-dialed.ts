import { normalizeStage } from "../stages.ts";
import { isDoNotTouch, phoneDigits, phonesMatch } from "./match.ts";
import { isFixtureContact, isHarborOwner, isUnassignedPool, type HarborQueueSource } from "./workflow.ts";

/** Harbor's own DID. A call "to" this number is inbound, never a lead. */
export const HARBOR_DID_DEFAULT = "+18703804010";
/** One card pull per dialed number / conversation inside this window. */
export const HARBOR_PULL_TTL_SECONDS = 900;
/** log_outcome / update_lead from the agent must target a card pulled within this window. */
export const HARBOR_PULLED_TTL_SECONDS = 3600;

const CLOSED_STAGES = new Set(["dnc", "not interested", "bought elsewhere", "won", "lost", "closed won", "closed lost"]);

function harborDialedStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** Last 10 digits (US) of the number Harbor dialed, or "" when missing / not a real number. */
export function dialedKey(raw: unknown): string {
  const d = phoneDigits(raw);
  if (d.length < 10) return "";
  return d.slice(-10);
}

export function readDialedPhone(body: Record<string, unknown>, url: URL): string {
  return harborDialedStr(body.phone) || harborDialedStr(body.to_number) || harborDialedStr(body.called_number) || harborDialedStr(url.searchParams.get("phone"));
}

export function readConversationId(body: Record<string, unknown>, url: URL): string {
  return harborDialedStr(body.conversation_id) || harborDialedStr(body.conversationId) || harborDialedStr(url.searchParams.get("conversation_id"));
}

export type DialedPick =
  | { contact: Record<string, unknown>; source: HarborQueueSource; reason: "matched" }
  | { contact: null; source: null; reason: "no_dialed_number" | "harbor_line" | "no_match" | "not_harbor_lead" | "closed" };

/** The CRM card for the number Harbor actually dialed. Never a queue card. */
export function pickDialedHarborLead(contacts: unknown, dialed: unknown, harborDid: unknown = HARBOR_DID_DEFAULT): DialedPick {
  const key = dialedKey(dialed);
  if (!key) return { contact: null, source: null, reason: "no_dialed_number" };
  if (phonesMatch(key, harborDid || HARBOR_DID_DEFAULT) || phonesMatch(key, HARBOR_DID_DEFAULT)) {
    return { contact: null, source: null, reason: "harbor_line" };
  }
  const rows = (Array.isArray(contacts) ? contacts : []).filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
  );
  const matches = rows.filter((row) => phonesMatch(key, row.phone) || phonesMatch(key, row.mobile));
  if (!matches.length) return { contact: null, source: null, reason: "no_match" };
  const open = matches.filter((row) => {
    if (isFixtureContact(row) || isDoNotTouch(row)) return false;
    const stage = String(normalizeStage(row.status || row.stage) || row.status || "").trim().toLowerCase();
    return !CLOSED_STAGES.has(stage);
  });
  if (!open.length) return { contact: null, source: null, reason: "closed" };
  const harbor = open.find((row) => isHarborOwner(row.owner));
  if (harbor) return { contact: harbor, source: "follow-up", reason: "matched" };
  const pool = open.find((row) => isUnassignedPool(row.owner));
  if (pool) return { contact: pool, source: "new-unassigned", reason: "matched" };
  return { contact: null, source: null, reason: "not_harbor_lead" };
}

export function harborNoMatchMessage(reason: string): string {
  if (reason === "no_dialed_number") return "No dialed number came with this call. No lead was pulled. Do not log an outcome.";
  if (reason === "harbor_line") return "This is the Harbor line, not a lead. No lead was pulled. Do not log an outcome.";
  if (reason === "closed") return "The number dialed belongs to a closed or do-not-call lead. No lead was pulled. Do not log an outcome.";
  if (reason === "not_harbor_lead") return "The number dialed belongs to another rep's lead. No lead was pulled. Do not log an outcome.";
  return "No matching lead for the number dialed. No lead was pulled. Do not log an outcome.";
}

type Kv = { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> };

const pullPhoneKey = (key: string) => "harbor:pull:p:" + key;
const pullConvKey = (id: string) => "harbor:pull:c:" + id;
const pulledIdKey = (id: string) => "harbor:pulled:id:" + id;

/** Contact id already pulled for this dialed number or conversation, if any. */
export async function harborPriorPull(kv: Kv | undefined, dialed: string, conversationId: string): Promise<string> {
  if (!kv) return "";
  const key = dialedKey(dialed);
  const byConv = conversationId ? await kv.get(pullConvKey(conversationId)) : null;
  if (byConv) return byConv;
  const byPhone = key ? await kv.get(pullPhoneKey(key)) : null;
  return byPhone || "";
}

export async function harborMarkPull(kv: Kv | undefined, dialed: string, conversationId: string, contactId: string): Promise<void> {
  if (!kv || !contactId) return;
  const key = dialedKey(dialed);
  const jobs: Promise<void>[] = [kv.put(pulledIdKey(contactId), String(Date.now()), { expirationTtl: HARBOR_PULLED_TTL_SECONDS })];
  if (key) jobs.push(kv.put(pullPhoneKey(key), contactId, { expirationTtl: HARBOR_PULL_TTL_SECONDS }));
  if (conversationId) jobs.push(kv.put(pullConvKey(conversationId), contactId, { expirationTtl: HARBOR_PULL_TTL_SECONDS }));
  await Promise.all(jobs);
}

/** Agent writes (log_outcome / update_lead) only land on a card get_next_lead handed out for a live call. */
export async function harborWasPulled(kv: Kv | undefined, contactId: string): Promise<boolean> {
  if (!kv || !contactId) return false;
  return Boolean(await kv.get(pulledIdKey(contactId)));
}
