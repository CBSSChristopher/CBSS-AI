import { titleOwner } from "../brand.ts";
import { normalizeStage } from "../stages.ts";
import { isDoNotTouch, matchCrmContact, phoneDigits } from "./match.ts";
import {
  HARBOR_OWNER,
  IMPORT_STAGE,
  META_CSV_METHOD,
  META_CSV_SOURCE,
  POOL_OWNER,
  isFixtureContact,
} from "./workflow.ts";

export { META_CSV_SOURCE, META_CSV_METHOD, IMPORT_STAGE };
export const IMPORT_ROW_CAP = 500;

const KNOWN: Record<string, string> = {
  phone: "phone",
  phone_number: "phone",
  phonenumber: "phone",
  mobile: "phone",
  cell: "phone",
  mobile_number: "phone",
  work_phone: "phone",
  full_name: "name",
  fullname: "name",
  name: "name",
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  last: "last_name",
  email: "email",
  email_address: "email",
  e_mail: "email",
  work_email: "email",
  company: "company",
  company_name: "company",
  business: "company",
  business_name: "company",
  city: "city",
  state: "state",
  zip: "zip",
  zip_code: "zip",
  postal: "zip",
  postal_code: "zip",
  created_time: "created_at",
  created_at: "created_at",
  created: "created_at",
  campaign_name: "campaign",
  campaign: "campaign",
  ad_name: "ad",
  ad: "ad",
  form_name: "form",
  form: "form",
  lead_id: "lead_id",
  id: "lead_id",
};

function clip(value: unknown, max = 400): string {
  return String(value == null ? "" : value).trim().slice(0, max);
}

export function headerKey(name: unknown): string {
  return String(name || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function parseCsvTable(text: string): string[][] {
  const src = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      if (row.some((v) => String(v).trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((v) => String(v).trim())) rows.push(row);
  return rows;
}

export type MetaLeadRow = {
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  state: string;
  zip: string;
  leadId: string;
  createdAt: string;
  campaign: string;
  ad: string;
  form: string;
  extras: Record<string, string>;
  skipReason: "" | "empty_phone";
};

const KNOWN_VALUES = new Set(Object.values(KNOWN));

export function mapLeadRecord(raw: Record<string, unknown>): MetaLeadRow {
  const mapped: Record<string, string> = {};
  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw || {})) {
    const header = headerKey(key);
    const canon = KNOWN[header];
    const text = clip(value, 2000);
    if (!text) continue;
    if (canon) mapped[canon] = mapped[canon] || text;
    else extras[header || key] = text;
  }
  const name =
    mapped.name ||
    [mapped.first_name, mapped.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const phone = mapped.phone || "";
  return {
    name: name || "Facebook lead",
    phone,
    email: mapped.email || "",
    company: mapped.company || "",
    city: mapped.city || "",
    state: mapped.state || "",
    zip: mapped.zip || "",
    leadId: mapped.lead_id || "",
    createdAt: mapped.created_at || "",
    campaign: mapped.campaign || "",
    ad: mapped.ad || "",
    form: mapped.form || "",
    extras,
    skipReason: phoneDigits(phone) ? "" : "empty_phone",
  };
}

export function isFixtureRow(row: MetaLeadRow): boolean {
  return isFixtureContact({
    name: row.name,
    source: row.leadId ? META_CSV_SOURCE : "",
    facebookLeadId: row.leadId,
    __fixture: row.extras.__fixture === "true" || row.extras.fixture === "true",
  });
}

export function parseLeadCsv(text: string): { rows: MetaLeadRow[]; skippedEmptyPhone: number; headers: string[] } {
  const table = parseCsvTable(text);
  const headers = (table[0] || []).map((h) => String(h || "").trim());
  const rows: MetaLeadRow[] = [];
  let skippedEmptyPhone = 0;
  for (const line of table.slice(1, IMPORT_ROW_CAP + 1)) {
    const rec: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      rec[header] = line[i] || "";
    });
    const row = mapLeadRecord(rec);
    if (row.skipReason === "empty_phone") skippedEmptyPhone += 1;
    rows.push(row);
  }
  return { rows, skippedEmptyPhone, headers };
}

export function parseLeadJsonRows(input: unknown): { rows: MetaLeadRow[]; skippedEmptyPhone: number; headers: string[] } {
  const list = Array.isArray(input) ? input : [];
  const rows: MetaLeadRow[] = [];
  let skippedEmptyPhone = 0;
  const headers = new Set<string>();
  for (const item of list.slice(0, IMPORT_ROW_CAP)) {
    const rec = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    Object.keys(rec).forEach((k) => headers.add(k));
    const row = mapLeadRecord(rec);
    if (row.skipReason === "empty_phone") skippedEmptyPhone += 1;
    rows.push(row);
  }
  return { rows, skippedEmptyPhone, headers: [...headers] };
}

export function leadImportNote(row: MetaLeadRow): string {
  const extras = Object.entries(row.extras)
    .filter(([k]) => !KNOWN_VALUES.has(k))
    .map(([k, v]) => k + ": " + v);
  const bits = [
    row.leadId ? "lead id " + row.leadId : "",
    row.campaign ? "campaign " + row.campaign : "",
    row.ad ? "ad " + row.ad : "",
    row.form ? "form " + row.form : "",
    row.createdAt ? "created " + row.createdAt : "",
    extras.length ? extras.join(" · ") : "",
  ].filter(Boolean);
  return [
    "Meta CSV import · " + META_CSV_SOURCE + " / " + META_CSV_METHOD + " · parked on " + POOL_OWNER + " · book stage " + IMPORT_STAGE + ".",
    bits.join(" · "),
    "Harbor may pull this card, self-assign, and run CTE. Not dialed until VA_DIAL_ARMED.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type LeadImportAction =
  | { action: "skip"; reason: "empty_phone" | "dnc" | "fixture"; row: MetaLeadRow }
  | { action: "create"; row: MetaLeadRow; contact: Record<string, unknown>; note: string }
  | { action: "update"; row: MetaLeadRow; contactId: string; patch: Record<string, unknown>; note: string; keepStage: boolean };

function canParkOnPool(contact: Record<string, unknown>): boolean {
  const stage = normalizeStage(contact.status || contact.stage);
  const owner = titleOwner(String(contact.owner || ""));
  return (!stage || stage === "New") && (owner === POOL_OWNER || !owner) && owner !== HARBOR_OWNER;
}

export function buildImportedContact(row: MetaLeadRow, now = new Date(), index = 0): Record<string, unknown> {
  return {
    id: now.getTime() + index,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    city: row.city,
    state: row.state,
    zip: row.zip,
    owner: POOL_OWNER,
    status: IMPORT_STAGE,
    source: META_CSV_SOURCE,
    created: (row.createdAt || now.toISOString()).slice(0, 10),
    facebookLeadId: row.leadId,
    nextAction: "Outbound VA — first dial (parked)",
    followUpDate: "",
  };
}

export function planLeadImport(rows: MetaLeadRow[], contacts: unknown, now = new Date()): {
  created: number;
  updated: number;
  skippedEmptyPhone: number;
  skippedDnc: number;
  skippedFixture: number;
  actions: LeadImportAction[];
} {
  const pool = Array.isArray(contacts) ? contacts.slice() : [];
  const actions: LeadImportAction[] = [];
  let created = 0;
  let updated = 0;
  let skippedEmptyPhone = 0;
  let skippedDnc = 0;
  let skippedFixture = 0;
  rows.forEach((row, index) => {
    if (row.skipReason === "empty_phone") {
      skippedEmptyPhone += 1;
      actions.push({ action: "skip", reason: "empty_phone", row });
      return;
    }
    if (isFixtureRow(row)) {
      skippedFixture += 1;
      actions.push({ action: "skip", reason: "fixture", row });
      return;
    }
    const hit = matchCrmContact(pool, { phone: row.phone, email: row.email });
    const note = leadImportNote(row);
    if (hit) {
      if (isFixtureContact(hit) || isDoNotTouch(hit)) {
        if (isFixtureContact(hit)) {
          skippedFixture += 1;
          actions.push({ action: "skip", reason: "fixture", row });
        } else {
          skippedDnc += 1;
          actions.push({ action: "skip", reason: "dnc", row });
        }
        return;
      }
      const keepStage = !canParkOnPool(hit);
      const patch: Record<string, unknown> = {
        source: META_CSV_SOURCE,
        facebookLeadId: row.leadId || hit.facebookLeadId,
      };
      if (row.email && !String(hit.email || "").trim()) patch.email = row.email;
      if (row.company && !String(hit.company || "").trim()) patch.company = row.company;
      if (row.city && !String(hit.city || "").trim()) patch.city = row.city;
      if (row.state && !String(hit.state || "").trim()) patch.state = row.state;
      if (row.zip && !String(hit.zip || "").trim()) patch.zip = row.zip;
      if (!keepStage) {
        patch.status = IMPORT_STAGE;
        patch.owner = POOL_OWNER;
      }
      updated += 1;
      actions.push({ action: "update", row, contactId: String(hit.id || ""), patch, note, keepStage });
      return;
    }
    const contact = buildImportedContact(row, now, index);
    created += 1;
    pool.push(contact);
    actions.push({ action: "create", row, contact, note });
  });
  return { created, updated, skippedEmptyPhone, skippedDnc, skippedFixture, actions };
}

export async function applyLeadImport(
  plan: ReturnType<typeof planLeadImport>,
  existingAdded: Record<string, unknown>[],
  write: {
    saveAdded: (added: Record<string, unknown>[]) => Promise<boolean>;
    saveEdits: (edits: Record<string, Record<string, unknown>>) => Promise<boolean>;
    appendNote: (contactId: string, text: string) => Promise<boolean>;
  },
): Promise<{ ok: boolean; created: number; updated: number; notes: number; errors: string[]; contactIds: string[] }> {
  const added = existingAdded.slice();
  const creates = plan.actions.filter((item): item is Extract<LeadImportAction, { action: "create" }> => item.action === "create");
  const updates = plan.actions.filter((item): item is Extract<LeadImportAction, { action: "update" }> => item.action === "update");
  const errors: string[] = [];
  const contactIds: string[] = [];
  if (creates.length) {
    for (const item of creates) added.unshift(item.contact);
    const ok = await write.saveAdded(added);
    if (!ok) errors.push("Could not save new contacts.");
  }
  const edits: Record<string, Record<string, unknown>> = {};
  for (const item of updates) {
    if (item.contactId) edits[item.contactId] = item.patch;
  }
  if (Object.keys(edits).length) {
    const ok = await write.saveEdits(edits);
    if (!ok) errors.push("Could not update matching contacts.");
  }
  let notes = 0;
  for (const item of plan.actions) {
    if (item.action === "skip") continue;
    const id = item.action === "create" ? String(item.contact.id || "") : item.contactId;
    if (!id) continue;
    contactIds.push(id);
    const ok = await write.appendNote(id, item.note);
    if (ok) notes += 1;
    else errors.push("Note missed for " + id + ".");
  }
  return {
    ok: errors.length === 0,
    created: creates.length,
    updated: updates.length,
    notes,
    errors,
    contactIds,
  };
}

export async function readImportPayload(request: Request): Promise<{
  csv: string;
  rows: unknown[] | null;
  dryRun: boolean;
  error: string;
}> {
  const ct = String(request.headers.get("Content-Type") || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file") || form.get("csv") || form.get("leads");
      let csv = "";
      if (file && typeof file === "object" && "text" in file) csv = await (file as File).text();
      else csv = String(file || "");
      const dry = String(form.get("dryRun") || form.get("preview") || "") === "true";
      return { csv, rows: null, dryRun: dry, error: csv.trim() ? "" : "Upload a Meta Lead Ads CSV first." };
    } catch {
      return { csv: "", rows: null, dryRun: false, error: "Could not read that upload." };
    }
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const csv = String(body.csv || body.text || "");
    const rows = Array.isArray(body.rows) ? body.rows : null;
    const dryRun = body.dryRun === true || body.preview === true;
    if (!csv.trim() && !rows) return { csv: "", rows: null, dryRun, error: "Paste CSV text or send rows." };
    return { csv, rows, dryRun, error: "" };
  } catch {
    return { csv: "", rows: null, dryRun: false, error: "Bad JSON. Send { csv } or { rows }." };
  }
}

export function publicImportPreview(plan: ReturnType<typeof planLeadImport>): Record<string, unknown> {
  return {
    created: plan.created,
    updated: plan.updated,
    skippedEmptyPhone: plan.skippedEmptyPhone,
    skippedDnc: plan.skippedDnc,
    skippedFixture: plan.skippedFixture,
    pile: POOL_OWNER,
    bookStage: IMPORT_STAGE,
    total: plan.actions.length,
    sample: plan.actions.slice(0, 8).map((item) => ({
      action: item.action,
      reason: item.action === "skip" ? item.reason : "",
      name: item.row.name,
      phone: item.row.phone,
      email: item.row.email,
      owner: item.action === "create" || (item.action === "update" && !item.keepStage) ? POOL_OWNER : "keep",
      stage: item.action === "create" || (item.action === "update" && !item.keepStage) ? IMPORT_STAGE : "keep",
    })),
  };
}
