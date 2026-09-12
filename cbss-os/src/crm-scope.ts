import { titleOwner } from "./brand.ts";
import { isChristopherUser } from "./facebook.ts";

export function canSeeAllCrmOwners(email: string, name: string): boolean {
  return isChristopherUser(email, name);
}

export function isUnassignedPool(owner: unknown): boolean {
  const named = titleOwner(String(owner || ""));
  return !named || named === "New/Unassigned";
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
  if (canSeeAllCrmOwners(viewer.email, viewer.name)) return { ...src, scoped: false };
  const contacts = asRows(src.contacts).filter((row) => ownerVisibleToViewer(row.owner, viewer.name, viewer.email));
  const contactsAdded = asRows(src.contactsAdded).filter((row) => ownerVisibleToViewer(row.owner, viewer.name, viewer.email));
  const ids = new Set<string>();
  for (const row of contacts.concat(contactsAdded)) {
    if (row.id != null) ids.add(String(row.id));
  }
  const deals = asRows(src.deals).filter((deal) => {
    if (deal.contactId != null && ids.has(String(deal.contactId))) return true;
    return ownerMatchesViewer(deal.owner, viewer.name, viewer.email);
  });
  return {
    ...src,
    contacts,
    contactsAdded,
    deals,
    followups: pickBag(src.followups, ids),
    contactEdits: pickBag(src.contactEdits, ids),
    completedTasks: pickBag(src.completedTasks, ids),
    scoped: true,
  };
}
