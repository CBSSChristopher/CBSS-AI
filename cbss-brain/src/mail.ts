import type { CrmBook, CrmContact, CrmDeal } from "./crm";
import { findContact } from "./crm";

export type InboundKind = "shopping" | "ready" | "question" | "need_info" | "quiet" | "other";

export function normalizeEmail(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^<|>$/g, "");
}

export function findContactByEmail(book: CrmBook, rawEmail: string): CrmContact | null {
  const want = normalizeEmail(rawEmail);
  if (!want) return null;
  const all = [...(book.contactsAdded || []), ...(book.contacts || [])];
  return all.find((c) => normalizeEmail(String(c.email || "")) === want) || null;
}

export function resolveMailContact(book: CrmBook, contactId: string, fromEmail: string): CrmContact | null {
  if (contactId) return findContact(book, contactId);
  if (fromEmail) return findContactByEmail(book, fromEmail);
  return null;
}

export function classifyInbound(subject: string, body: string): InboundKind {
  const t = `${subject} ${body}`.toLowerCase();
  if (/unsubscrib|do not contact|stop emailing/.test(t)) return "quiet";
  if (
    /spreadsheet|comparing quotes|other quotes|got your proposal|received your proposal|i'll be in touch|i will be in touch|will be in touch|added it to|added to my quote/.test(
      t,
    )
  ) {
    return "shopping";
  }
  if (/let'?s do it|ready to buy|send the invoice|i want it|lock it in|take it/.test(t)) return "ready";
  if (/zip|address|site access|how much|what size|can you|question/.test(t)) return "question";
  if (/need|missing|confirm/.test(t)) return "need_info";
  return "other";
}

export function followUpFromKind(
  kind: InboundKind,
  now = new Date(),
): { nextAction: string; followUpDate: string; stage: string } {
  const day = (plus: number, hour: number) => {
    const d = new Date(now.getTime() + plus * 24 * 60 * 60 * 1000);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return iso.slice(0, 11) + String(hour).padStart(2, "0") + ":00";
  };
  if (kind === "shopping") {
    return {
      nextAction: "Check back — they have the proposal and are comparing quotes.",
      followUpDate: day(3, 9),
      stage: "Proposal Sent",
    };
  }
  if (kind === "ready") {
    return {
      nextAction: "They are ready. Confirm site and collect before the truck.",
      followUpDate: day(0, 10),
      stage: "Proposal Sent",
    };
  }
  if (kind === "question" || kind === "need_info") {
    return {
      nextAction: "Reply to their question. Get ZIP / site if still NEED.",
      followUpDate: day(1, 9),
      stage: "Quote",
    };
  }
  if (kind === "quiet") {
    return { nextAction: "Quiet / do not chase unless they write again.", followUpDate: "", stage: "" };
  }
  return { nextAction: "Reply and book the next step.", followUpDate: day(2, 9), stage: "Contacted" };
}

export function mailNoteText(log: {
  direction: "sent" | "received";
  templateId?: string;
  subject?: string;
  from?: string;
  kind?: string;
  body?: string;
}): string {
  const dir = log.direction === "sent" ? "SENT email" : "RECEIVED email";
  const bits = [dir];
  if (log.templateId) bits.push(`template ${log.templateId}`);
  if (log.subject) bits.push(`Subject: ${log.subject}`);
  if (log.from) bits.push(`From: ${log.from}`);
  if (log.kind) bits.push(`Read as: ${log.kind}`);
  const body = String(log.body || "").trim();
  if (body) bits.push(body.slice(0, 1200));
  return bits.join("\n");
}

export function stageAfterOutbound(hasProposal: boolean): string {
  return hasProposal ? "Proposal Sent" : "Contacted";
}

export function outboundFollowup(
  hasProposal: boolean,
  now = new Date(),
): { nextAction: string; followUpDate: string } {
  const d = new Date(now.getTime() + (hasProposal ? 2 : 1) * 24 * 60 * 60 * 1000);
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return {
    nextAction: hasProposal
      ? "Check if they got the proposal and want to lock it."
      : "Follow the email. Get ZIP / size if still NEED.",
    followUpDate: iso.slice(0, 11) + "09:00",
  };
}

export function upsertDealStage(
  deals: CrmDeal[],
  contact: CrmContact,
  stage: string,
  amount?: string,
): CrmDeal[] {
  if (!stage) return deals || [];
  const list = Array.isArray(deals) ? deals.slice() : [];
  const idx = list.findIndex((d) => String(d.contactId) === String(contact.id));
  const today = new Date().toISOString().slice(0, 10);
  if (idx >= 0) {
    list[idx] = { ...list[idx], stage, updated: today, ...(amount ? { amount } : {}) };
    return list;
  }
  list.push({
    id: Date.now(),
    contactId: contact.id,
    contactName: String(contact.name || ""),
    name: `${contact.name || "Contact"} - Container`,
    stage,
    amount: amount || "",
  });
  return list;
}

export function mergeContactEdit(
  edits: Record<string, Record<string, unknown>>,
  contactId: string,
  patch: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const key = String(contactId);
  return {
    ...(edits || {}),
    [key]: { ...(edits || {})[key], ...patch },
  };
}
