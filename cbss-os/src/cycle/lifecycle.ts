import { lifecycleForStage, normalizeStage, type Stage } from "../stages.ts";

export const LIFECYCLES = ["New", "Working", "Quoted", "Invoiced", "Paid", "Delivered"] as const;
export const EXITS = ["Lost", "Not interested", "Bought elsewhere"] as const;
export type Lifecycle = (typeof LIFECYCLES)[number] | (typeof EXITS)[number];

export function normalizeLifecycle(raw: unknown, fallback?: unknown): Lifecycle | "" {
  const stage = normalizeStage(raw, fallback);
  return stage ? lifecycleForStage(stage) : "";
}

/** Book status written back from a CTE lifecycle. Refinements (Follow-up, Proposal Sent, DNC) stay as-is on the card. */
export function legacyStatusFor(life: Lifecycle): string {
  return life || "New";
}

export function bookStatusFor(life: Lifecycle, current?: unknown): string {
  const cur = normalizeStage(current);
  if (life === "Working" && (cur === "Follow-up" || cur === "Email campaign")) return cur;
  if (life === "Quoted" && cur === "Proposal Sent") return cur;
  if (life === "Lost" && cur === "DNC") return "DNC";
  return life || cur || "New";
}

export function isExit(life: string): boolean {
  return (EXITS as readonly string[]).includes(life);
}

export function isOpenLifecycle(life: string): boolean {
  return (LIFECYCLES as readonly string[]).includes(life);
}

export function isParkOnlyStage(stage: Stage): boolean {
  return stage === "DNC" || stage === "Email campaign";
}
