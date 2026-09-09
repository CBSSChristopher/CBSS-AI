function digits(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return d;
}

function emailOf(raw: string): string {
  const e = String(raw || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

function asAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type AnyRec = Record<string, unknown>;

function contactId(row: AnyRec | null | undefined): string {
  if (!row) return "";
  const id = row.id != null ? row.id : row.contactId;
  return id == null ? "" : String(id);
}

function matches(row: AnyRec, email: string, phone: string): boolean {
  const em = emailOf(String(row.email || row.contactEmail || ""));
  const ph = digits(String(row.phone || row.contactPhone || ""));
  if (email && em && em === email) return true;
  if (phone && ph && ph === phone) return true;
  return false;
}

export function agreedProposalAmount(book: AnyRec, emailRaw: string, phoneRaw: string): {
  ok: boolean;
  amount?: number;
  contactId?: string;
  name?: string;
  source?: string;
  error?: string;
} {
  const email = emailOf(emailRaw);
  const phone = digits(phoneRaw);
  if (!email && !phone) return { ok: false, error: "Type the customer email or phone first." };
  const added = Array.isArray(book.contactsAdded) ? (book.contactsAdded as AnyRec[]) : [];
  const archive = Array.isArray(book.contacts) ? (book.contacts as AnyRec[]) : [];
  const deals = Array.isArray(book.deals) ? (book.deals as AnyRec[]) : [];
  const proposals = book.proposals && typeof book.proposals === "object" ? (book.proposals as Record<string, AnyRec[]>) : {};
  const edits = book.contactEdits && typeof book.contactEdits === "object" ? (book.contactEdits as Record<string, AnyRec>) : {};

  const pools = added.concat(archive);
  let hit: AnyRec | null = null;
  for (const row of pools) {
    if (!row || typeof row !== "object") continue;
    const overlay = edits[String(row.id)] || {};
    const merged = { ...row, ...overlay };
    if (matches(merged, email, phone)) {
      hit = merged;
      break;
    }
  }
  if (!hit) {
    for (const deal of deals) {
      if (deal && matches(deal, email, phone)) {
        hit = deal;
        break;
      }
    }
  }
  if (!hit) return { ok: false, error: "No CRM contact matched that email or phone." };

  const id = contactId(hit);
  const list = (id && Array.isArray(proposals[id]) ? proposals[id] : [])
    .concat(id && Array.isArray(proposals[String(id)]) ? proposals[String(id)] : []);
  for (const p of list) {
    const amt = asAmount(p && (p.amount || p.unitPrice));
    if (amt != null) {
      return {
        ok: true,
        amount: amt,
        contactId: id,
        name: String(hit.name || hit.contactName || ""),
        source: "proposal",
      };
    }
  }
  const deal = deals.find((d) => String(d.contactId) === id || String(d.contactId) === String(hit.id));
  const dealAmt = asAmount(deal && deal.amount);
  if (dealAmt != null) {
    return {
      ok: true,
      amount: dealAmt,
      contactId: id,
      name: String(hit.name || hit.contactName || ""),
      source: "deal",
    };
  }
  const contactAmt = asAmount(hit.amount);
  if (contactAmt != null) {
    return {
      ok: true,
      amount: contactAmt,
      contactId: id,
      name: String(hit.name || hit.contactName || ""),
      source: "contact",
    };
  }
  return { ok: false, error: "CRM has that person, but no agreed cash number yet. Do not invent one." };
}
