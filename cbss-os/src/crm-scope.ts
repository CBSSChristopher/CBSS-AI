import { titleOwner } from "./brand.ts";
import { isChristopherUser } from "./facebook.ts";

export function canSeeAllCrmOwners(email: string, name: string): boolean {
  return isChristopherUser(email, name);
}

export function isUnassignedPool(owner: unknown): boolean {
  const named = titleOwner(String(owner || ""));
  return !named || named === "New/Unassigned";
}

function asEdit(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function editForId(edits: unknown, id: unknown): Record<string, unknown> {
  const bag = asEdit(edits);
  if (id == null || id === "") return {};
  return asEdit(bag[String(id)] ?? bag[id as string]);
}

export function effectiveOwner(row: Record<string, unknown> | null | undefined, edits: unknown = {}): string {
  const src = row && typeof row === "object" ? row : {};
  const ed = editForId(edits, src.id);
  const raw = ed.owner != null && String(ed.owner).trim() ? ed.owner : src.owner;
  return titleOwner(String(raw || ""));
}

function normEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normPhone(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function normName(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** If an unassigned card is the same person as an already-assigned lead, take that owner. */
export function claimAssignedOwner(
  row: Record<string, unknown>,
  assigned: Array<Record<string, unknown>>,
): string {
  if (!row || !isUnassignedPool(row.owner)) return "";
  const email = normEmail(row.email);
  const phone = normPhone(row.phone);
  const name = normName(row.name);
  const pool = assigned.filter((other) => other && String(other.id) !== String(row.id) && !isUnassignedPool(other.owner));
  if (email) {
    const hit = pool.find((other) => normEmail(other.email) === email);
    if (hit) return titleOwner(String(hit.owner || ""));
  }
  if (phone.length >= 7) {
    const hit = pool.find((other) => normPhone(other.phone) === phone);
    if (hit) return titleOwner(String(hit.owner || ""));
  }
  if (name && name.includes(" ")) {
    const hits = pool.filter((other) => normName(other.name) === name);
    if (hits.length === 1) return titleOwner(String(hits[0].owner || ""));
  }
  return "";
}

export function applyOwnerEdits(payload: Record<string, unknown>): {
  contacts: Array<Record<string, unknown>>;
  contactsAdded: Array<Record<string, unknown>>;
} {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const edits = src.contactEdits;
  const stamp = (row: Record<string, unknown>) => {
    const next = { ...row, ...editForId(edits, row.id) };
    next.owner = titleOwner(String(next.owner || ""));
    return next;
  };
  const contacts = asRows(src.contacts).map(stamp);
  const contactsAdded = asRows(src.contactsAdded).map(stamp);
  const assigned = contacts.concat(contactsAdded).filter((row) => !isUnassignedPool(row.owner));
  const claim = (row: Record<string, unknown>) => {
    const taken = claimAssignedOwner(row, assigned);
    return taken ? { ...row, owner: taken } : row;
  };
  return { contacts: contacts.map(claim), contactsAdded: contactsAdded.map(claim) };
}

export function ownerMatchesViewer(owner: unknown, viewerName: string, viewerEmail: string): boolean {
  const named = titleOwner(String(owner || ""));
  const mine = titleOwner(viewerName || viewerEmail);
  if (named && mine && named === mine) return true;
  const raw = String(owner || "").trim().toLowerCase();
  const email = String(viewerEmail || "").trim().toLowerCase();
  return Boolean(email && raw === email);
}

export function ownerVisibleToViewer(owner: unknown, viewerName: string, viewerEmail: string): boolean {
  return ownerMatchesViewer(owner, viewerName, viewerEmail) || isUnassignedPool(owner);
}

export function shouldScopeCrmGet(rest: string, search: string, method: string): boolean {
  if (String(method || "").toUpperCase() !== "GET") return false;
  const path = String(rest || "");
  if (path !== "/crm-data" && !path.startsWith("/crm-data?")) return false;
  const action = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("action") || "";
  return action === "get" || action === "";
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row))) : [];
}

function pickBag(bag: unknown, ids: Set<string>): Record<string, unknown> {
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
    if (ids.has(String(key))) out[key] = value;
  }
  return out;
}

/** Client `__mine__` is display-only. Non-Christopher GET /crm-data is scoped here.
 *  Christopher (christopher@ or name Christopher Banks) sees every owner — that is the admin exception.
 *  Every other rep also gets the New/Unassigned pool so they can take a Facebook / web lead.
 *  Other named books stay hidden. Writes are not rewritten by owner; GET must not leak other reps. */
export function scopeCrmGetPayload(
  payload: Record<string, unknown>,
  viewer: { email: string; name: string },
): Record<string, unknown> {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const owned = applyOwnerEdits(src);
  const next = { ...src, contacts: owned.contacts, contactsAdded: owned.contactsAdded };
  if (canSeeAllCrmOwners(viewer.email, viewer.name)) return { ...next, scoped: false };
  const contacts = owned.contacts.filter((row) => ownerVisibleToViewer(row.owner, viewer.name, viewer.email));
  const contactsAdded = owned.contactsAdded.filter((row) => ownerVisibleToViewer(row.owner, viewer.name, viewer.email));
  const ids = new Set<string>();
  for (const row of contacts.concat(contactsAdded)) {
    if (row.id != null) ids.add(String(row.id));
  }
  const deals = asRows(src.deals).filter((deal) => {
    if (deal.contactId != null && ids.has(String(deal.contactId))) return true;
    return ownerMatchesViewer(deal.owner, viewer.name, viewer.email);
  });
  return {
    ...next,
    contacts,
    contactsAdded,
    deals,
    followups: pickBag(src.followups, ids),
    contactEdits: pickBag(src.contactEdits, ids),
    completedTasks: pickBag(src.completedTasks, ids),
    proposals: pickBag(src.proposals, ids),
    scoped: true,
  };
}
