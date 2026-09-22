import { vaOutcomeLabel, type VaOutcome } from "./outcomes.ts";

export const VA_NOTE_TAG = "Book";
export const DEFAULT_CLOSER = "Christopher Banks";

export function clipVaText(text: unknown, max = 400): string {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function vaActivityNote(input: {
  outcome: VaOutcome | "";
  contactName?: string;
  phone?: string;
  closer?: string;
  at?: string;
  bookedAt?: string;
  summary?: string;
  transcript?: string;
}): string {
  const outcome = vaOutcomeLabel(input.outcome) || "capture";
  const who = String(input.contactName || "").trim() || "unknown contact";
  const phone = String(input.phone || "").replace(/\D/g, "") || "no phone";
  const closer = String(input.closer || "").trim() || DEFAULT_CLOSER;
  const at = String(input.at || input.bookedAt || "").trim() || new Date().toISOString();
  const lines = [
    `VA outbound · ${outcome} · ${who} · ${phone} · closer ${closer} · ${at}`,
  ];
  if (input.bookedAt && input.outcome === "booked") {
    lines.push("Appointment: " + String(input.bookedAt).trim());
  }
  const summary = clipVaText(input.summary, 240);
  if (summary) lines.push("Summary: " + summary);
  const transcript = clipVaText(input.transcript, 280);
  if (transcript) lines.push("Transcript: " + transcript);
  return lines.join("\n");
}
