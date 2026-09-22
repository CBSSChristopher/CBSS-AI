import { isDoNotTouch, matchCrmContact } from "./match.ts";
import { vaActivityNote } from "./note.ts";
import type { VaCapture } from "./store.ts";

export type FlushPlan =
  | { action: "skip"; reason: "already" | "unmatched" | "dnc" }
  | { action: "write"; contactId: string; note: string };

export function planVaFlush(capture: VaCapture, contacts: unknown): FlushPlan {
  if (capture.crmFlushed) return { action: "skip", reason: "already" };
  const hit = matchCrmContact(contacts, {
    contactId: capture.contactId,
    phone: capture.phone || capture.from,
  });
  if (!hit) return { action: "skip", reason: "unmatched" };
  const contactId = String(hit.id || "").trim();
  if (!contactId) return { action: "skip", reason: "unmatched" };
  if (isDoNotTouch(hit) && capture.outcome !== "DNC") return { action: "skip", reason: "dnc" };
  const name = capture.contactName || String(hit.name || "");
  return {
    action: "write",
    contactId,
    note: vaActivityNote({
      outcome: capture.outcome,
      contactName: name,
      phone: capture.phone || capture.from || String(hit.phone || ""),
      closer: capture.closer,
      at: capture.receivedAt,
      bookedAt: capture.bookedAt,
      summary: capture.summary,
      transcript: capture.transcript,
    }),
  };
}

export function applyFlushResult(
  capture: VaCapture,
  plan: FlushPlan,
  wrote: boolean,
  error = "",
): VaCapture {
  const next = { ...capture };
  if (plan.action === "skip") {
    next.skippedReason = plan.reason;
    next.crmFlushError = "";
    if (plan.reason === "already") next.crmFlushed = true;
    return next;
  }
  if (wrote) {
    next.contactId = plan.contactId;
    next.crmFlushed = true;
    next.crmFlushAt = new Date().toISOString();
    next.crmFlushError = "";
    next.skippedReason = "";
    return next;
  }
  next.crmFlushError = error || "CRM note did not save.";
  return next;
}
