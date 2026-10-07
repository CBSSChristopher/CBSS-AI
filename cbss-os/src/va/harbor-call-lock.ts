import { dialedKey } from "./harbor-dialed.ts";
import { normalizeCteStep, normalizeHarborOutcome, nextCteStep, type CteStep } from "./workflow.ts";

/**
 * One Harbor call = one outcome.
 *
 * A personal voicemail greeting can sound live. Harbor then logs no-answer, asks for the lead again,
 * gets the same card back (already_pulled), and logs no-answer a second time. Before this guard that
 * second log advanced the CTE card again and fired the next CTE email a minute after the first.
 *
 * Every log_outcome / update_lead for a call is keyed to that call:
 *   1. the get_next_lead pull stamp for the card (one pull per call; a new call re-stamps it),
 *   2. else conversation_id when the tool sends one,
 *   3. else contact id + dialed number inside a 10-minute window.
 * Belt and braces: a CTE email to the lead inside the last 10 minutes (cycle record) also blocks a
 * second email and a second step, even if the call key was lost.
 * Per call: CTE moves at most one step, at most one outcome email goes out, and a repeat
 * no-answer / voicemail / answered is folded into the first log instead of re-running it.
 */
export const HARBOR_CALL_WINDOW_SECONDS = 600;
export const HARBOR_CALL_LOCK_TTL_SECONDS = 3600;

type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type HarborCallState = {
  key: string;
  contactId: string;
  cteStart: CteStep;
  cteNow: CteStep;
  advanced: boolean;
  mailed: boolean;
  mailStep: string;
  outcomes: string[];
  firstAt: string;
  lastAt: string;
};

const pulledIdKey = (id: string) => "harbor:pulled:id:" + id;

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** Stable key for "this call" on this card. */
export async function harborCallKey(
  kv: Kv | undefined,
  contactId: string,
  opts: { conversationId?: unknown; dialed?: unknown } = {},
): Promise<string> {
  const id = clean(contactId);
  if (!id) return "";
  // The pull stamp is shared by every tool on the call (log_outcome does not send conversation_id),
  // so it wins. A new call re-pulls and re-stamps the card.
  const stamp = kv ? clean(await kv.get(pulledIdKey(id))) : "";
  if (stamp) return "harbor:call:p:" + id + ":" + stamp;
  const conv = clean(opts.conversationId);
  if (conv && !conv.includes("{{")) return "harbor:call:c:" + conv + ":" + id;
  return "harbor:call:w:" + id + ":" + (dialedKey(opts.dialed) || "-");
}

export async function readHarborCall(kv: Kv | undefined, key: string): Promise<HarborCallState | null> {
  if (!kv || !key) return null;
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HarborCallState;
    return parsed && typeof parsed === "object" && parsed.contactId ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeHarborCall(kv: Kv | undefined, state: HarborCallState): Promise<void> {
  if (!kv || !state.key) return;
  const ttl = state.key.startsWith("harbor:call:w:") ? HARBOR_CALL_WINDOW_SECONDS : HARBOR_CALL_LOCK_TTL_SECONDS;
  await kv.put(state.key, JSON.stringify(state), { expirationTtl: ttl });
}

export function freshHarborCall(key: string, contactId: string, cte: unknown, now = new Date()): HarborCallState {
  const start = normalizeCteStep(cte);
  return {
    key,
    contactId: clean(contactId),
    cteStart: start,
    cteNow: start,
    advanced: false,
    mailed: false,
    mailStep: "",
    outcomes: [],
    firstAt: now.toISOString(),
    lastAt: now.toISOString(),
  };
}

const CTE_RANK: Record<CteStep, number> = { CTE1: 1, CTE2: 2, CTE3: 3, CTE4: 4 };

/** Highest CTE step this call may leave the card at: one step past where the call started. */
export function harborCallCteCeiling(state: HarborCallState): CteStep {
  return nextCteStep(state.cteStart);
}

/** Clamp a requested CTE step so one call never moves the card more than one step. */
export function clampHarborCallCte(state: HarborCallState, requested: unknown): CteStep {
  const want = normalizeCteStep(requested);
  const ceiling = harborCallCteCeiling(state);
  if (state.advanced && CTE_RANK[want] > CTE_RANK[state.cteNow]) return state.cteNow;
  return CTE_RANK[want] > CTE_RANK[ceiling] ? ceiling : want;
}

const ADVANCING = new Set(["no-answer", "voicemail"]);
const REPEAT_FOLD = new Set(["no-answer", "voicemail", "answered", "inbound-answered"]);

export type HarborCallDecision = {
  /** Second+ outcome on the same call. */
  repeat: boolean;
  /** Skip every CRM edit and follow-up row; write only an audit note. */
  noteOnly: boolean;
  /** Final CTE step to write (already clamped). */
  cteStage: CteStep;
  /** Outcome email allowed on this log. */
  allowMail: boolean;
  /** Why mail / stage were held back, for the note and the tool response. */
  reason: string;
};

/**
 * Decide what one log_outcome may do given what this call already logged.
 * planCte = the step harborOutcomePlan would write. recentMail = a CTE email went to this lead
 * inside the call window (belt and braces when the call key is lost).
 */
export function decideHarborCallOutcome(
  state: HarborCallState,
  rawOutcome: unknown,
  planCte: unknown,
  opts: { recentMail?: boolean } = {},
): HarborCallDecision {
  const outcome = normalizeHarborOutcome(rawOutcome);
  const repeat = state.outcomes.length > 0;
  const mailedAlready = state.mailed || Boolean(opts.recentMail);
  if (repeat && REPEAT_FOLD.has(outcome) && (state.advanced || mailedAlready || state.outcomes.includes(outcome))) {
    return {
      repeat: true,
      noteOnly: true,
      cteStage: state.cteNow,
      allowMail: false,
      reason: "Outcome already logged on this call (" + state.outcomes.join(", ") + "). Card stays " + state.cteNow + ". No second email.",
    };
  }
  let cteStage = normalizeCteStep(planCte);
  if (ADVANCING.has(outcome) && (state.advanced || opts.recentMail)) cteStage = state.cteNow;
  cteStage = clampHarborCallCte(state, cteStage);
  const allowMail = !mailedAlready;
  let reason = "";
  if (!allowMail) reason = "One email per call: an outcome email already went out on this call. No second email.";
  return { repeat, noteOnly: false, cteStage, allowMail, reason };
}

/** Record what this log did. */
export function recordHarborCallOutcome(
  state: HarborCallState,
  rawOutcome: unknown,
  wrote: { cteStage: CteStep; mailed: boolean; mailStep?: string },
  now = new Date(),
): HarborCallState {
  const outcome = normalizeHarborOutcome(rawOutcome) || clean(rawOutcome);
  const next: HarborCallState = { ...state, outcomes: [...state.outcomes, outcome], lastAt: now.toISOString() };
  if (CTE_RANK[wrote.cteStage] > CTE_RANK[state.cteNow]) next.advanced = true;
  next.cteNow = wrote.cteStage;
  if (wrote.mailed) {
    next.mailed = true;
    next.mailStep = wrote.mailStep || next.mailStep;
  }
  return next;
}

/** A CTE email went to this lead inside the window, per the cycle record. */
export function cycleMailedWithin(
  rec: { sends?: Record<string, { status?: string; sentAt?: string } | undefined> } | null | undefined,
  windowSeconds = HARBOR_CALL_WINDOW_SECONDS,
  now = new Date(),
): boolean {
  if (!rec || !rec.sends) return false;
  const floor = now.getTime() - windowSeconds * 1000;
  for (const id of ["cte1", "cte2", "cte3", "cte4"]) {
    const send = rec.sends[id];
    if (!send || send.status !== "sent" || !send.sentAt) continue;
    const at = Date.parse(send.sentAt);
    if (Number.isFinite(at) && at >= floor && at <= now.getTime() + 60_000) return true;
  }
  return false;
}
