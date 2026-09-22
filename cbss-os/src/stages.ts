/** One stage language for the book, pipeline, and CTE. Old CRM names still normalize in. */

export const STAGES = [
  "New",
  "Working",
  "Follow-up",
  "Email campaign",
  "Quoted",
  "Ready to buy",
  "Proposal Sent",
  "Invoiced",
  "Paid",
  "Delivered",
  "Lost",
  "Not interested",
  "Bought elsewhere",
  "DNC",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_ALIASES: Record<string, Stage> = {
  new: "New",
  "new lead": "New",
  working: "Working",
  contacted: "Working",
  connecting: "Working",
  connected: "Working",
  "cte in progress": "Working",
  cte: "Working",
  "follow-up": "Follow-up",
  "follow up": "Follow-up",
  "follow up in progress": "Follow-up",
  followup: "Follow-up",
  "email campaign": "Email campaign",
  campaign: "Email campaign",
  quoted: "Quoted",
  quote: "Quoted",
  "flex buy": "Quoted",
  "ready to buy": "Ready to buy",
  "ready-to-buy": "Ready to buy",
  handoff: "Ready to buy",
  "new/unassigned": "New",
  newunassigned: "New",
  "proposal sent": "Proposal Sent",
  invoiced: "Invoiced",
  invoice: "Invoiced",
  paid: "Paid",
  won: "Paid",
  delivered: "Delivered",
  lost: "Lost",
  "not interested": "Not interested",
  "bought elsewhere": "Bought elsewhere",
  dnc: "DNC",
  "do not contact": "DNC",
};

const STAGE_TO_LIFECYCLE: Record<Stage, "New" | "Working" | "Quoted" | "Invoiced" | "Paid" | "Delivered" | "Lost" | "Not interested" | "Bought elsewhere"> = {
  New: "New",
  Working: "Working",
  "Follow-up": "Working",
  "Email campaign": "Working",
  Quoted: "Quoted",
  "Ready to buy": "Quoted",
  "Proposal Sent": "Quoted",
  Invoiced: "Invoiced",
  Paid: "Paid",
  Delivered: "Delivered",
  Lost: "Lost",
  "Not interested": "Not interested",
  "Bought elsewhere": "Bought elsewhere",
  DNC: "Lost",
};

export function normalizeStage(raw: unknown, fallback?: unknown): Stage | "" {
  const first = STAGE_ALIASES[String(raw || "").trim().toLowerCase()];
  if (first) return first;
  const second = STAGE_ALIASES[String(fallback || "").trim().toLowerCase()];
  return second || "";
}

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function lifecycleForStage(stage: Stage) {
  return STAGE_TO_LIFECYCLE[stage];
}

export function stageMatches(stored: unknown, column: Stage): boolean {
  return normalizeStage(stored) === column;
}

/** Pipeline always shows the money path even when a column is empty. */
export const PIPELINE_ALWAYS: readonly Stage[] = ["New", "Working", "Quoted", "Ready to buy", "Proposal Sent", "Paid", "Lost"];
