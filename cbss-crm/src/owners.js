export const COMPANY_EMAIL_RE = /@cbshippingsolutions\.com$/i;

export const UNASSIGNED_POOL = "New/Unassigned";

export function isUnassignedPool(value) {
  const raw = String(value == null ? "" : value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return raw === "new/unassigned" || raw === "newunassigned" || raw === "unassigned" || raw === "leadpool" || raw === "newpool";
}

export const STAFF_OWNERS = {
  christopher: "Christopher Banks",
  james: "James",
  bryan: "Bryan Reese",
  matthew: "Matthew Brent",
  veeka: "Kawika Pangelinan",
  veek: "Kawika Pangelinan",
  ivyanna: "Ivyanna",
  aliyah: "Aliyah",
  kyle: "Kyle",
  mery: "Mery",
  terrell: "Terrell",
  joshua: "Joshua"
};

export function titleCaseWords(value) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function companyEmailLocal(value) {
  const raw = String(value == null ? "" : value).trim();
  const match = raw.match(/^([^@\s]+)@cbshippingsolutions\.com$/i);
  return match ? match[1].toLowerCase() : "";
}

export function canonicalizeOwner(value) {
  const raw = String(value == null ? "" : value).trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (/^contact owner$/i.test(raw)) return "";
  if (isUnassignedPool(raw)) return UNASSIGNED_POOL;
  const local = companyEmailLocal(raw);
  if (local) return STAFF_OWNERS[local] || titleCaseWords(local.replace(/[._-]+/g, " "));
  const lower = raw.toLowerCase();
  if (STAFF_OWNERS[lower]) return STAFF_OWNERS[lower];
  const titled = titleCaseWords(raw);
  const titledLocal = companyEmailLocal(titled);
  if (titledLocal) return STAFF_OWNERS[titledLocal] || titleCaseWords(titledLocal.replace(/[._-]+/g, " "));
  return STAFF_OWNERS[titled.toLowerCase()] || titled;
}

export function mergeContactEdits(current, incoming) {
  const prev = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  const nextIn = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
  const out = {};
  for (const key of Object.keys(prev)) {
    const row = prev[key] && typeof prev[key] === "object" ? Object.assign({}, prev[key]) : prev[key];
    if (row && typeof row === "object" && row.owner !== undefined) {
      row.owner = canonicalizeOwner(row.owner);
    }
    out[key] = row;
  }
  for (const key of Object.keys(nextIn)) {
    const incomingRow = nextIn[key];
    if (!incomingRow || typeof incomingRow !== "object") continue;
    const prevRow = out[key] && typeof out[key] === "object" ? out[key] : {};
    const merged = Object.assign({}, prevRow, incomingRow);
    if (merged.owner !== undefined) merged.owner = canonicalizeOwner(merged.owner);
    out[key] = merged;
  }
  return out;
}

export function mergeContactsAdded(current, incoming) {
  const map = new Map();
  const put = (row) => {
    if (!row || row.id == null) return;
    const id = String(row.id);
    const prev = map.get(id);
    map.set(id, prev ? Object.assign({}, prev, row) : row);
  };
  (current || []).forEach(put);
  (incoming || []).forEach(put);
  const out = [];
  const seen = new Set();
  for (const row of incoming || []) {
    if (!row || row.id == null) continue;
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(map.get(id));
  }
  for (const row of current || []) {
    if (!row || row.id == null) continue;
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function editFor(edits, id) {
  if (!edits || typeof edits !== "object") return {};
  return edits[id] || edits[String(id)] || (Number(id) ? edits[Number(id)] : null) || {};
}

function firstProposal(proposals, id) {
  if (!proposals || typeof proposals !== "object") return null;
  const raw = proposals[id] || proposals[String(id)] || (Number(id) ? proposals[Number(id)] : null);
  if (Array.isArray(raw)) return raw[0] || null;
  return raw && typeof raw === "object" ? raw : null;
}

function contactNameFromDeal(deal) {
  if (!deal) return "";
  const named = String(deal.contactName || "").trim();
  if (named) return named;
  return String(deal.name || "").replace(/\s+-\s+Container\s*$/i, "").trim();
}

export function restoreMissingContacts(archive, added, deals, edits, notes, followups, proposals) {
  const have = new Set();
  for (const row of [...(archive || []), ...(added || [])]) {
    if (row && row.id != null) have.add(String(row.id));
  }
  const want = new Set();
  for (const deal of deals || []) {
    if (deal && deal.contactId != null && deal.contactId !== "") want.add(String(deal.contactId));
  }
  for (const bag of [edits, notes, followups, proposals]) {
    if (!bag || typeof bag !== "object") continue;
    for (const key of Object.keys(bag)) {
      if (key === "2621") continue;
      want.add(String(key));
    }
  }
  const out = Array.isArray(added) ? added.slice() : [];
  for (const id of want) {
    if (!id || id === "2621" || have.has(id)) continue;
    const overlay = editFor(edits, id);
    const deal = (deals || []).find((d) => String(d && d.contactId) === id);
    const proposal = firstProposal(proposals, id);
    const name = String(
      overlay.name || contactNameFromDeal(deal) || (proposal && proposal.customerName) || ""
    ).trim();
    const email = String(overlay.email || (proposal && proposal.email) || "").trim();
    const phone = String(overlay.phone || (proposal && proposal.phone) || "").trim();
    if (!name && !email && !phone && !deal && !proposal) continue;
    const follow = followups && (followups[id] || followups[String(id)]);
    out.unshift({
      id: Number(id) || id,
      name: name || "Contact",
      company: overlay.company || (proposal && proposal.company) || "",
      email,
      phone,
      street: overlay.street || "",
      city: overlay.city || "",
      state: overlay.state || "",
      zip: overlay.zip || (proposal && proposal.zip) || "",
      owner: canonicalizeOwner(overlay.owner || (deal && deal.owner) || (proposal && (proposal.repName || proposal.repEmail)) || ""),
      status: overlay.status || (deal && deal.stage) || "New Lead",
      created: overlay.created || (deal && deal.created) || "",
      source: overlay.source || (proposal ? "Proposal Tool" : deal ? "Proposal Tool" : "Manual"),
      nextAction: follow && follow.nextAction || overlay.nextAction || "",
      followUpDate: follow && follow.followUpDate || overlay.followUpDate || "",
      notes: [],
      dnc: Boolean(overlay.dnc),
      containerSize: overlay.containerSize || (proposal && proposal.containerSize) || "",
      condition: overlay.condition || (proposal && proposal.condition) || "",
      quantity: overlay.quantity || (proposal && proposal.quantity) || "",
      depot: overlay.depot || (deal && deal.depot) || "",
      delivery: overlay.delivery || (proposal && proposal.delivery) || "",
      amount: overlay.amount != null && overlay.amount !== "" ? overlay.amount : deal && deal.amount != null ? deal.amount : "",
      wholesale: overlay.wholesale != null && overlay.wholesale !== "" ? overlay.wholesale : deal && deal.wholesale != null ? deal.wholesale : "",
      paymentMode: overlay.paymentMode || (proposal && proposal.paymentMode) || "",
      clientType: overlay.clientType || ""
    });
    have.add(id);
  }
  return out;
}

export function canonicalizeOwnerFields(row) {
  if (!row || typeof row !== "object") return false;
  const next = canonicalizeOwner(row.owner);
  if ((row.owner || "") === next) return false;
  row.owner = next;
  return true;
}

export function healPortedBook(state, archive) {
  const currentAdded = Array.isArray(state.contactsAdded) ? state.contactsAdded : [];
  const restored = restoreMissingContacts(
    archive,
    currentAdded,
    state.deals,
    state.contactEdits,
    state.notes,
    state.followups,
    state.proposals
  );
  let changed = restored.length !== currentAdded.length;
  if (!changed) {
    const before = new Set(currentAdded.map((c) => String(c && c.id)));
    changed = restored.some((c) => c && !before.has(String(c.id)));
  }
  state.contactsAdded = restored;
  for (const row of state.contactsAdded) {
    if (canonicalizeOwnerFields(row)) changed = true;
  }
  const edits = state.contactEdits && typeof state.contactEdits === "object" ? state.contactEdits : {};
  for (const row of archive || []) {
    if (!row || row.id == null) continue;
    const next = canonicalizeOwner(row.owner);
    if ((row.owner || "") === next) continue;
    const key = edits[row.id] != null ? row.id : edits[String(row.id)] != null ? String(row.id) : row.id;
    edits[key] = Object.assign({}, edits[key] || {}, { owner: next });
    row.owner = next;
    changed = true;
  }
  state.contactEdits = edits;
  for (const row of state.deals || []) {
    if (canonicalizeOwnerFields(row)) changed = true;
  }
  for (const key of Object.keys(state.contactEdits || {})) {
    if (canonicalizeOwnerFields(state.contactEdits[key])) changed = true;
  }
  return changed;
}
