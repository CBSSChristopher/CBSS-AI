import { titleOwner } from "../brand.ts";
import { normalizeStage } from "../stages.ts";
import { isDoNotTouch, phoneDigits } from "./match.ts";

export const HARBOR_OWNER = "Harbor";
export const POOL_OWNER = "New/Unassigned";
export const IMPORT_STAGE = "New";
export const META_CSV_SOURCE = "facebook_lead_ads";
export const META_CSV_METHOD = "meta_csv";

export const HUMAN_CLOSERS = ["Christopher Banks", "Bryan Reese"] as const;
export type HumanCloser = (typeof HUMAN_CLOSERS)[number];

export const CTE_STEPS = ["CTE1", "CTE2", "CTE3", "CTE4"] as const;
export type CteStep = (typeof CTE_STEPS)[number];

export const HARBOR_OUTCOMES = [
  "no-answer",
  "voicemail",
  "answered",
  "callback",
  "ready-to-buy",
  "not-interested",
  "DNC",
  "wrong-number",
] as const;
export type HarborOutcome = (typeof HARBOR_OUTCOMES)[number];

const OUTCOME_ALIASES: Record<string, HarborOutcome> = {
  "no-answer": "no-answer",
  no_answer: "no-answer",
  "no answer": "no-answer",
  unanswered: "no-answer",
  voicemail: "voicemail",
  vm: "voicemail",
  answered: "answered",
  connected: "answered",
  "did answer": "answered",
  callback: "callback",
  "call back": "callback",
  "ready-to-buy": "ready-to-buy",
  "ready to buy": "ready-to-buy",
  handoff: "ready-to-buy",
  "not-interested": "not-interested",
  "not interested": "not-interested",
  dnc: "DNC",
  "do not call": "DNC",
  "wrong-number": "wrong-number",
  "wrong number": "wrong-number",
  "bad number": "wrong-number",
};

export function normalizeHarborOutcome(raw: unknown): HarborOutcome | "" {
  return OUTCOME_ALIASES[String(raw || "").trim().toLowerCase()] || "";
}

export function isHarborOwner(value: unknown): boolean {
  return titleOwner(String(value || "")) === HARBOR_OWNER;
}

export function isUnassignedPool(value: unknown): boolean {
  return titleOwner(String(value || "")) === POOL_OWNER || !titleOwner(String(value || ""));
}

export function resolveCloser(raw: unknown): HumanCloser {
  const titled = titleOwner(String(raw || ""));
  if (titled === "Bryan Reese") return "Bryan Reese";
  return "Christopher Banks";
}

export function normalizeCteStep(raw: unknown): CteStep {
  const key = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
  if (key === "CTE2") return "CTE2";
  if (key === "CTE3") return "CTE3";
  if (key === "CTE4") return "CTE4";
  return "CTE1";
}

export function nextCteStep(current: unknown): CteStep {
  const now = normalizeCteStep(current);
  if (now === "CTE1") return "CTE2";
  if (now === "CTE2") return "CTE3";
  if (now === "CTE3") return "CTE4";
  return "CTE4";
}

export function isFixtureContact(contact: Record<string, unknown> | null | undefined): boolean {
  if (!contact) return false;
  const source = String(contact.source || "").trim().toLowerCase();
  if (source === "test" || source === "fixture" || source === "demo") return true;
  const name = String(contact.name || "").trim();
  if (/^test[-_]/i.test(name) || /^fixture\b/i.test(name)) return true;
  const leadId = String(contact.facebookLeadId || contact.leadId || "").trim();
  if (/^test[-_]/i.test(leadId) || leadId.toLowerCase() === "test-lead") return true;
  return contact.__fixture === true || contact.fixture === true;
}

export function isCallableHarborLead(contact: Record<string, unknown> | null | undefined): boolean {
  if (!contact) return false;
  if (isFixtureContact(contact)) return false;
  if (isDoNotTouch(contact)) return false;
  if (!phoneDigits(contact.phone || contact.mobile)) return false;
  return isUnassignedPool(contact.owner);
}

export function pickHarborNext(contacts: unknown): Record<string, unknown> | null {
  const rows = Array.isArray(contacts) ? contacts : [];
  const hit = rows.find((row) => row && typeof row === "object" && isCallableHarborLead(row as Record<string, unknown>));
  return hit && typeof hit === "object" ? (hit as Record<string, unknown>) : null;
}

export function harborAssignPatch(cte: CteStep = "CTE1"): Record<string, unknown> {
  return {
    owner: HARBOR_OWNER,
    status: "Working",
    cteStage: cte,
    nextAction: cte + " — Harbor outbound (dial parked until VA_DIAL_ARMED)",
  };
}

export function harborOutcomePlan(
  contact: Record<string, unknown>,
  rawOutcome: unknown,
  opts: { closer?: unknown; note?: string; cte?: unknown } = {},
): {
  outcome: HarborOutcome | "";
  owner: string;
  status: string;
  cteStage: CteStep;
  closer: HumanCloser;
  note: string;
  handoff: boolean;
} {
  const outcome = normalizeHarborOutcome(rawOutcome);
  const currentCte = normalizeCteStep(contact.cteStage || opts.cte || "CTE1");
  const closer = resolveCloser(opts.closer);
  const extra = String(opts.note || "").trim();
  let owner = titleOwner(String(contact.owner || "")) || HARBOR_OWNER;
  let status = normalizeStage(contact.status) || "Working";
  let cteStage = currentCte;
  let handoff = false;
  let line = "";

  if (outcome === "no-answer" || outcome === "voicemail") {
    cteStage = nextCteStep(currentCte);
    status = "Working";
    owner = HARBOR_OWNER;
    line =
      outcome === "voicemail"
        ? "Harbor · CTE " + currentCte + " · Voicemail left. Next " + cteStage + ". No stuck card."
        : "Harbor · CTE " + currentCte + " · No answer. Next " + cteStage + ". Move to the next lead.";
  } else if (outcome === "answered") {
    status = "Working";
    owner = HARBOR_OWNER;
    cteStage = currentCte;
    line = "Harbor · CTE " + currentCte + " · They answered. Sales conversation on this card. Harbor does not take payment.";
  } else if (outcome === "callback") {
    status = "Follow-up";
    owner = HARBOR_OWNER;
    line = "Harbor · CTE " + currentCte + " · Callback booked. Stay on Harbor until they pick up or ready-to-buy.";
  } else if (outcome === "ready-to-buy") {
    status = "Ready to buy";
    owner = closer;
    handoff = true;
    cteStage = currentCte;
    line =
      "Harbor · CTE " +
      currentCte +
      " · Ready to buy. Handed to " +
      closer +
      " for final close + payment. Cards frozen — wire / ACH / e-check / money order / cashier's check / cash only. Harbor does not collect payment.";
  } else if (outcome === "not-interested") {
    status = "Not interested";
    line = "Harbor · CTE " + currentCte + " · Not interested. Card closed. Next lead.";
  } else if (outcome === "DNC") {
    status = "DNC";
    line = "Harbor · CTE " + currentCte + " · DNC. Do not call again.";
  } else if (outcome === "wrong-number") {
    status = "Email campaign";
    line = "Harbor · CTE " + currentCte + " · Wrong number. Off the dial queue.";
  } else {
    line = "Harbor · CTE " + currentCte + " · Need a call outcome.";
  }

  const note = [line, extra].filter(Boolean).join("\n");
  return { outcome, owner, status, cteStage, closer, note, handoff };
}

export function harborAssignNote(cte: CteStep = "CTE1"): string {
  return (
    "Harbor pulled this card off New/Unassigned and self-assigned. " +
    cte +
    " is open. Standard Yard CTE cadence (CTE1 call one → CTE2 → CTE3 → CTE4). Dial stays parked until Christopher arms VA_DIAL_ARMED."
  );
}
