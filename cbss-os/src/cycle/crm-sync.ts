import { crmPatchForLifecycle, type CrmLifecyclePatch, type Lifecycle } from "./lifecycle.ts";

export type { CrmLifecyclePatch };

export type CrmBook = {
  contacts?: Array<Record<string, unknown>>;
  contactsAdded?: Array<Record<string, unknown>>;
  deals?: Array<Record<string, unknown>>;
  contactEdits?: Record<string, Record<string, unknown>>;
};

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row)))
    : [];
}

function patchContactRow(row: Record<string, unknown>, id: string, patch: CrmLifecyclePatch): Record<string, unknown> {
  if (String(row.id ?? "") !== id) return row;
  return {
    ...row,
    status: patch.status,
    ...(patch.invoicePaid ? { invoicePaid: patch.invoicePaid } : {}),
  };
}

/**
 * Apply a Lifecycle CRM patch onto a book snapshot.
 * Updates contact.status, invoicePaid (Paid/Delivered), and deal.stage so list views
 * cannot stay on Proposal Sent after Lifecycle Paid.
 */
export function applyLifecycleToCrmBook(book: CrmBook, contactId: string, patch: CrmLifecyclePatch): CrmBook {
  const id = String(contactId || "").trim();
  if (!id || !patch?.status) return book;
  const contacts = asRows(book.contacts).map((row) => patchContactRow(row, id, patch));
  const contactsAdded = asRows(book.contactsAdded).map((row) => patchContactRow(row, id, patch));
  const contact = contacts.find((row) => String(row.id) === id)
    || contactsAdded.find((row) => String(row.id) === id);
  const edits = { ...(book.contactEdits && typeof book.contactEdits === "object" ? book.contactEdits : {}) };
  const nextEdit = { ...(edits[id] && typeof edits[id] === "object" ? edits[id] : {}), ...patch };
  edits[id] = nextEdit;
  edits[String(contactId)] = nextEdit;

  const deals = asRows(book.deals).map((deal) => ({ ...deal }));
  const existing = deals.find((deal) => String(deal.contactId ?? "") === id);
  if (existing) {
    existing.stage = patch.status;
  } else {
    deals.push({
      id: "c-" + id,
      contactId: id,
      contactName: contact ? String(contact.name || "") : "",
      owner: contact ? String(contact.owner || "") : "",
      stage: patch.status,
      amount: contact && contact.amount != null ? contact.amount : "",
    });
  }
  return { ...book, contacts, contactsAdded, deals, contactEdits: edits };
}

export function crmPatchFromLifecycleName(life: string): CrmLifecyclePatch | null {
  const known = [
    "New", "Working", "Quoted", "Invoiced", "Paid", "Delivered",
    "Lost", "Not interested", "Bought elsewhere",
  ];
  if (!known.includes(life)) return null;
  return crmPatchForLifecycle(life as Lifecycle);
}
