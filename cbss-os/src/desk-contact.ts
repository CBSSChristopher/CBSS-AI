import { titleOwner } from "./brand.ts";

export type DeskContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  zip: string;
  street: string;
  notes: string;
};

export type DeskAddedContact = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  zip: string;
  street: string;
  owner: string;
  status: "New Lead";
  source: "Desk";
  created: string;
  nextAction: string;
  followUpDate: string;
};

function clip(value: unknown, max = 2000): string {
  return String(value == null ? "" : value).trim().slice(0, max);
}

export function readDeskContactDraft(raw: Record<string, unknown>): DeskContactDraft {
  const body = raw && typeof raw === "object" ? raw : {};
  const nested = body.create && typeof body.create === "object" ? (body.create as Record<string, unknown>) : {};
  const src = { ...nested, ...body };
  const firstName = clip(src.firstName || src.first);
  const lastName = clip(src.lastName || src.last);
  const name = clip(src.name);
  const parts = name ? name.split(/\s+/) : [];
  return {
    firstName: firstName || (parts[0] || ""),
    lastName: lastName || (parts.length > 1 ? parts.slice(1).join(" ") : ""),
    email: clip(src.email, 200),
    phone: clip(src.phone, 40),
    company: clip(src.company || src.business || src.businessName, 200),
    city: clip(src.city, 80),
    state: clip(src.state, 40),
    zip: clip(src.zip, 12),
    street: clip(src.street || src.address, 300),
    notes: clip(src.notes, 8000),
  };
}

export function deskContactName(draft: DeskContactDraft): string {
  return [draft.firstName, draft.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function buildDeskAddedContact(
  draft: DeskContactDraft,
  owner: string,
  now = new Date(),
): DeskAddedContact {
  return {
    id: now.getTime(),
    name: deskContactName(draft),
    email: draft.email,
    phone: draft.phone,
    company: draft.company,
    city: draft.city,
    state: draft.state,
    zip: draft.zip,
    street: draft.street,
    owner: titleOwner(owner) || clip(owner, 80),
    status: "New Lead",
    source: "Desk",
    created: now.toISOString().slice(0, 10),
    nextAction: "",
    followUpDate: "",
  };
}

export function phoneDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function findOwnDeskContact(
  rows: Array<Record<string, unknown>>,
  draft: DeskContactDraft,
  owner: string,
): Record<string, unknown> | null {
  const wantOwner = titleOwner(owner);
  const phone = phoneDigits(draft.phone);
  const email = draft.email.toLowerCase();
  const all = Array.isArray(rows) ? rows : [];
  if (phone.length >= 10) {
    const hit = all.find((c) => phoneDigits(String(c.phone || "")) === phone && titleOwner(String(c.owner || "")) === wantOwner);
    if (hit) return hit;
  }
  if (email) {
    const hit = all.find((c) => String(c.email || "").trim().toLowerCase() === email && titleOwner(String(c.owner || "")) === wantOwner);
    if (hit) return hit;
  }
  return null;
}
