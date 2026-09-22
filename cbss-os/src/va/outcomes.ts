/** Locked v1 taxonomy. Unknown text is rejected — do not invent a slug. */

export const VA_OUTCOMES = [
  "no-answer",
  "gatekeeper",
  "not-interested",
  "callback",
  "booked",
  "DNC",
  "wrong-number",
] as const;

export type VaOutcome = (typeof VA_OUTCOMES)[number];

export const VA_OUTCOME_ALIASES: Record<string, VaOutcome> = {
  "no-answer": "no-answer",
  no_answer: "no-answer",
  "no answer": "no-answer",
  voicemail: "no-answer",
  unanswered: "no-answer",
  gatekeeper: "gatekeeper",
  gate: "gatekeeper",
  receptionist: "gatekeeper",
  "not-interested": "not-interested",
  not_interested: "not-interested",
  "not interested": "not-interested",
  ni: "not-interested",
  no: "not-interested",
  callback: "callback",
  "call back": "callback",
  "call-back": "callback",
  booked: "booked",
  book: "booked",
  appointment: "booked",
  "site visit": "booked",
  "booked-call": "booked",
  dnc: "DNC",
  "do not call": "DNC",
  "do-not-call": "DNC",
  "do not contact": "DNC",
  "wrong-number": "wrong-number",
  wrong_number: "wrong-number",
  "wrong number": "wrong-number",
  "bad number": "wrong-number",
  disconnected: "wrong-number",
};

export function normalizeVaOutcome(raw: unknown): VaOutcome | "" {
  const key = String(raw || "").trim().toLowerCase();
  if (!key) return "";
  return VA_OUTCOME_ALIASES[key] || "";
}

export function isVaOutcome(value: string): value is VaOutcome {
  return (VA_OUTCOMES as readonly string[]).includes(value);
}

export function vaOutcomeLabel(outcome: VaOutcome | ""): string {
  if (outcome === "no-answer") return "No answer";
  if (outcome === "gatekeeper") return "Gatekeeper";
  if (outcome === "not-interested") return "Not interested";
  if (outcome === "callback") return "Callback";
  if (outcome === "booked") return "Booked";
  if (outcome === "DNC") return "DNC";
  if (outcome === "wrong-number") return "Wrong number";
  return "";
}
