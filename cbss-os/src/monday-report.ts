import { isUnassignedPool } from "./crm-scope.ts";
import { STAGES, normalizeStage, type Stage } from "./stages.ts";

export type MondayContact = Record<string, unknown>;

function ownerOf(row: MondayContact, edits: Record<string, Record<string, unknown>>): string {
  const id = String(row.id || "");
  const ed = edits[id];
  if (ed && ed.owner) return String(ed.owner);
  return String(row.owner || "");
}

function facebookish(row: MondayContact): boolean {
  return /facebook|meta|\bfb\b/i.test(String(row.source || row.leadSource || ""));
}

function storedAmount(row: MondayContact): number | null {
  const raw = row.amount != null && row.amount !== "" ? row.amount : "";
  const n = parseFloat(String(raw).replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function followupOpen(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (row.completed === true || row.done === true) return false;
  return Boolean(row.nextAction || row.followUpDate || row.when);
}

export function buildMondayReport(book: {
  contacts?: MondayContact[];
  contactsAdded?: MondayContact[];
  contactEdits?: Record<string, Record<string, unknown>>;
  deals?: MondayContact[];
  followups?: Record<string, unknown> | unknown[];
  proposals?: Record<string, unknown>;
}): {
  ok: true;
  title: string;
  contacts: number;
  added: number;
  deals: number;
  openFollowups: number;
  unassigned: number;
  facebookUnassigned: number;
  facebookBook: number;
  stages: Record<string, number>;
  paidCards: number;
  proposalSentWithAmount: number;
  proposalSentBlank: number;
  storedProposalDollars: number;
  note: string;
} {
  const edits = book.contactEdits && typeof book.contactEdits === "object" ? book.contactEdits : {};
  const contacts = Array.isArray(book.contacts) ? book.contacts : [];
  const added = Array.isArray(book.contactsAdded) ? book.contactsAdded : [];
  const all = [...contacts, ...added];
  const deals = Array.isArray(book.deals) ? book.deals : [];
  const followups = book.followups;
  const openFollowups = Array.isArray(followups)
    ? followups.filter(followupOpen).length
    : followups && typeof followups === "object"
      ? Object.values(followups).filter(followupOpen).length
      : 0;

  const stages = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  let unassigned = 0;
  let facebookUnassigned = 0;
  let facebookBook = 0;
  let paidCards = 0;
  let proposalSentWithAmount = 0;
  let proposalSentBlank = 0;
  let storedProposalDollars = 0;

  for (const row of all) {
    const owner = ownerOf(row, edits);
    const stage = normalizeStage(row.status, row.stage) || "New";
    if (stages[stage] != null) stages[stage] += 1;
    if (isUnassignedPool(owner)) unassigned += 1;
    if (facebookish(row)) {
      facebookBook += 1;
      if (isUnassignedPool(owner)) facebookUnassigned += 1;
    }
    if (stage === "Paid") paidCards += 1;
    if (stage === "Proposal Sent") {
      const amt = storedAmount(row);
      if (amt) {
        proposalSentWithAmount += 1;
        storedProposalDollars += amt;
      } else {
        proposalSentBlank += 1;
      }
    }
  }

  return {
    ok: true,
    title: "Monday book",
    contacts: contacts.length,
    added: added.length,
    deals: deals.length,
    openFollowups,
    unassigned,
    facebookUnassigned,
    facebookBook,
    stages,
    paidCards,
    proposalSentWithAmount,
    proposalSentBlank,
    storedProposalDollars,
    note: "Stored proposal dollars only. Blank Proposal Sent cards stay blank — no invented price. This report does not email anyone until Christopher says go.",
  };
}
