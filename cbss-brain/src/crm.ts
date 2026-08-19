export type CrmNote = {
  author: string;
  timestamp: string;
  tag: string;
  text: string;
};

export type CrmFollowup = {
  nextAction: string;
  followUpDate: string;
};

export type CrmContact = {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
  owner?: string;
  status?: string;
  company?: string;
  nextAction?: string;
  followUpDate?: string;
  notes?: CrmNote[];
  source?: string;
};

export type CrmDeal = {
  id?: number | string;
  contactId?: number | string;
  contactName?: string;
  name?: string;
  stage?: string;
  owner?: string;
  amount?: string | number;
};

export type CrmBook = {
  contacts: CrmContact[];
  contactsAdded: CrmContact[];
  notes: Record<string, CrmNote[]>;
  followups: Record<string, CrmFollowup>;
  deals: CrmDeal[];
  contactEdits: Record<string, Record<string, unknown>>;
};

export type PublicContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  zip: string;
  owner: string;
  stage: string;
  nextAction: string;
  followUpDate: string;
};

const CRM_ORIGIN = "https://cbsscrm.cbss.workers.dev";
export const PROTECTED_NOTE_KEY = "2621";

export function titleCaseOwner(value: string): string {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function emailLocalPart(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[0] || "";
}

export function isOwnerUser(email: string, name: string): boolean {
  return emailLocalPart(email) === "christopher" || /^christopher banks$/i.test(String(name || "").trim());
}

function ownerNeedles(email: string, name: string): Set<string> {
  const local = emailLocalPart(email);
  const needles = new Set<string>();
  const add = (raw: string) => {
    const t = titleCaseOwner(raw).toLowerCase();
    if (t) needles.add(t);
  };
  add(name);
  add(local);
  add(local.replace(/[._-]+/g, " "));
  add(email);
  const aliases: Record<string, string[]> = {
    james: ["James"],
    bryan: ["Bryan Reese", "Bryan"],
    christopher: ["Christopher Banks", "Christopher"],
  };
  for (const alias of aliases[local] || []) add(alias);
  return needles;
}

export function ownerMatchesSession(owner: string, email: string, name: string): boolean {
  const raw = String(owner || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const e = String(email || "").trim().toLowerCase();
  if (e && (lower === e || lower.includes(e))) return true;
  const needles = ownerNeedles(email, name);
  const titled = titleCaseOwner(raw).toLowerCase();
  if (needles.has(titled) || needles.has(lower)) return true;
  const firsts = new Set([...needles].map((n) => n.split(" ")[0]).filter(Boolean));
  return firsts.has(titled.split(" ")[0]);
}

export function noteTimestamp(now = new Date()): string {
  return now.toISOString().slice(0, 16).replace("T", " ");
}

export function appendNoteToMap(
  notes: Record<string, CrmNote[]>,
  contactId: string,
  entry: CrmNote,
): Record<string, CrmNote[]> {
  const out: Record<string, CrmNote[]> = {};
  for (const [key, value] of Object.entries(notes || {})) {
    out[key] = Array.isArray(value) ? value.slice() : [];
  }
  const key = String(contactId);
  const list = Array.isArray(out[key]) ? out[key].slice() : [];
  list.unshift(entry);
  out[key] = list;
  return out;
}

export function mergeFollowupMap(
  followups: Record<string, CrmFollowup>,
  contactId: string,
  followup: CrmFollowup,
): Record<string, CrmFollowup> {
  return {
    ...(followups || {}),
    [String(contactId)]: {
      nextAction: String(followup.nextAction || "").trim(),
      followUpDate: String(followup.followUpDate || "").trim(),
    },
  };
}

export function contactStage(contact: CrmContact, deals: CrmDeal[]): string {
  const deal = (deals || []).find((d) => String(d.contactId) === String(contact.id));
  return String((deal && deal.stage) || contact.status || "").trim();
}

function haystack(contact: CrmContact): string {
  return [
    contact.name,
    contact.email,
    contact.phone,
    contact.city,
    contact.state,
    contact.zip,
    contact.company,
    contact.owner,
  ]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");
}

export function searchContacts(
  book: CrmBook,
  query: string,
  email: string,
  name: string,
  limit = 40,
): PublicContact[] {
  const q = String(query || "").trim().toLowerCase();
  const ownerSeesAll = isOwnerUser(email, name);
  const deals = book.deals || [];
  const merged = new Map<string, CrmContact>();
  for (const contact of [...(book.contacts || []), ...(book.contactsAdded || [])]) {
    if (!contact || contact.id == null) continue;
    merged.set(String(contact.id), contact);
  }
  const hits: PublicContact[] = [];
  for (const contact of merged.values()) {
    if (!ownerSeesAll && !ownerMatchesSession(String(contact.owner || ""), email, name)) continue;
    if (q && !haystack(contact).includes(q) && !String(contact.phone || "").includes(q)) continue;
    const follow = book.followups?.[String(contact.id)] || book.followups?.[String(Number(contact.id))];
    hits.push({
      id: String(contact.id),
      name: String(contact.name || "Unnamed"),
      phone: String(contact.phone || ""),
      email: String(contact.email || ""),
      city: String(contact.city || ""),
      state: String(contact.state || ""),
      zip: String(contact.zip || ""),
      owner: String(contact.owner || ""),
      stage: contactStage(contact, deals),
      nextAction: String((follow && follow.nextAction) || contact.nextAction || ""),
      followUpDate: String((follow && follow.followUpDate) || contact.followUpDate || ""),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

export function buildCreatedContact(input: {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  zip?: string;
  owner: string;
  now?: Date;
}): CrmContact {
  const now = input.now || new Date();
  return {
    id: now.getTime(),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim(),
    zip: String(input.zip || "").trim(),
    street: "",
    owner: input.owner,
    status: "New Lead",
    created: now.toISOString().slice(0, 10),
    source: "Desk",
    nextAction: "",
    followUpDate: "",
    notes: [],
    company: "",
  } as CrmContact;
}

async function crmFetch(env: Env, token: string, path: string, init?: RequestInit): Promise<Response> {
  if (!env.CRM) throw new Error("CRM binding missing");
  const headers = new Headers(init?.headers || {});
  headers.set("Cookie", `cbss_session=${token}`);
  headers.set("Accept", "application/json");
  headers.set("Origin", CRM_ORIGIN);
  headers.set("Referer", `${CRM_ORIGIN}/`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const req = new Request(`${CRM_ORIGIN}${path}`, { ...init, headers });
  return env.CRM.fetch(req);
}

export async function crmGetBook(env: Env, token: string): Promise<CrmBook> {
  const res = await crmFetch(env, token, "/crm-data?action=get");
  const rawText = await res.text();
  if (!res.ok) throw new Error(`CRM get failed (${res.status})`);
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error("CRM get returned non-JSON");
  }
  return {
    contacts: Array.isArray(data.contacts) ? (data.contacts as CrmContact[]) : [],
    contactsAdded: Array.isArray(data.contactsAdded) ? (data.contactsAdded as CrmContact[]) : [],
    notes: data.notes && typeof data.notes === "object" ? (data.notes as Record<string, CrmNote[]>) : {},
    followups:
      data.followups && typeof data.followups === "object"
        ? (data.followups as Record<string, CrmFollowup>)
        : {},
    deals: Array.isArray(data.deals) ? (data.deals as CrmDeal[]) : [],
    contactEdits:
      data.contactEdits && typeof data.contactEdits === "object"
        ? (data.contactEdits as Record<string, Record<string, unknown>>)
        : {},
  };
}

async function crmSave(env: Env, token: string, action: string, payload: Record<string, unknown>): Promise<void> {
  const res = await crmFetch(env, token, "/crm-data", {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CRM ${action} failed (${res.status}) ${text.slice(0, 120)}`);
  }
}

export async function crmSaveNotes(env: Env, token: string, notes: Record<string, CrmNote[]>): Promise<void> {
  if (!notes[PROTECTED_NOTE_KEY]) {
    throw new Error("Refusing to write notes: protected note key is missing");
  }
  await crmSave(env, token, "saveNotes", { notes });
}

export async function crmSaveFollowups(
  env: Env,
  token: string,
  followups: Record<string, CrmFollowup>,
): Promise<void> {
  await crmSave(env, token, "saveFollowups", { followups });
}

export async function crmSaveContactsAdded(env: Env, token: string, contactsAdded: CrmContact[]): Promise<void> {
  await crmSave(env, token, "saveContactsAdded", { contactsAdded });
}

export async function crmSaveDeals(env: Env, token: string, deals: CrmDeal[]): Promise<void> {
  await crmSave(env, token, "saveDeals", { deals });
}

export async function crmSaveContactEdits(
  env: Env,
  token: string,
  contactEdits: Record<string, Record<string, unknown>>,
): Promise<void> {
  await crmSave(env, token, "saveContactEdits", { contactEdits });
}

export async function crmIngestProposal(
  env: Env,
  token: string,
  proposal: Record<string, unknown>,
): Promise<{ ok: boolean; contactId?: string }> {
  const res = await crmFetch(env, token, "/crm-data", {
    method: "POST",
    body: JSON.stringify({ action: "ingestProposal", ...proposal }),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`CRM ingestProposal failed (${res.status}) ${text.slice(0, 120)}`);
  try {
    return JSON.parse(text) as { ok: boolean; contactId?: string };
  } catch {
    return { ok: true };
  }
}

export function findContact(book: CrmBook, contactId: string): CrmContact | null {
  const want = String(contactId);
  const all = [...(book.contactsAdded || []), ...(book.contacts || [])];
  return all.find((c) => String(c.id) === want) || null;
}
