import { isLiveFollowup, mergeNoteOntoContact } from "./followups.js";

export const DEFAULT_ADMIN_CLEANUP_CODE = "2621";

const FILL_FIELDS = [
  "name",
  "email",
  "phone",
  "street",
  "city",
  "state",
  "zip",
  "owner",
  "company",
  "source",
  "status",
  "containerSize",
  "condition",
  "depot",
  "delivery",
  "paymentMode",
  "amount",
  "wholesale",
  "clientType"
];

export function adminCleanupCodeOk(env, provided) {
  const want = String((env && env.CRM_ADMIN_CODE) || DEFAULT_ADMIN_CLEANUP_CODE).trim();
  const got = String(provided || "").trim();
  if (!want || !got || want.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export function isFoldedEdit(row) {
  if (!row || typeof row !== "object") return false;
  if (row.folded === true || row.mergedAway === true) return true;
  if (row.mergedInto || row.duplicateOf) return true;
  return false;
}

export function preserveFoldedFlags(current, incoming) {
  const merged = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? Object.assign({}, incoming) : {};
  const prev = current && typeof current === "object" ? current : {};
  for (const key of Object.keys(prev)) {
    const row = prev[key];
    if (!row || typeof row !== "object") continue;
    const folded = isFoldedEdit(row);
    if (row.archived !== true && !folded) continue;
    const keep = Object.assign({}, merged[key] || {});
    if (row.archived === true || folded) keep.archived = true;
    if (folded) {
      keep.folded = true;
      keep.mergedAway = true;
      keep.owner = "";
      if (row.mergedInto) keep.mergedInto = row.mergedInto;
      if (row.duplicateOf) keep.duplicateOf = row.duplicateOf;
    }
    merged[key] = keep;
    if (String(key) !== key) {
      merged[String(key)] = Object.assign({}, merged[String(key)] || {}, keep);
    }
  }
  return merged;
}

export function contactById(pools, id) {
  const want = String(id == null ? "" : id).trim();
  if (!want) return null;
  for (const list of pools) {
    for (const row of list || []) {
      if (row && String(row.id) === want) return row;
    }
  }
  return null;
}

function isArchivedRow(contact, archiveRequests) {
  if (contact && contact.archived === true) return true;
  const reqs = archiveRequests && typeof archiveRequests === "object" ? archiveRequests : {};
  const req = reqs[contact && contact.id] || reqs[String(contact && contact.id)];
  return !!(req && String(req.status || "").toLowerCase() === "approved");
}

function blank(v) {
  return v == null || String(v).trim() === "";
}

export function fillKeeperFromDuplicate(keep, source) {
  const next = Object.assign({}, keep || {});
  for (const field of FILL_FIELDS) {
    if (blank(next[field]) && !blank(source && source[field])) next[field] = source[field];
  }
  if (source && source.dnc === true) next.dnc = true;
  if (next.dnc === true && blank(next.status)) next.status = "DNC";
  return next;
}

function noteList(notes, id) {
  if (!notes || typeof notes !== "object") return [];
  const direct = notes[id];
  const asString = notes[String(id)];
  if (Array.isArray(direct)) return direct.slice();
  if (Array.isArray(asString)) return asString.slice();
  return [];
}

function mergeNoteLists(keepList, sourceList) {
  const out = [];
  const seen = new Set();
  for (const note of [].concat(keepList || [], sourceList || [])) {
    if (!note || typeof note !== "object") continue;
    const key = JSON.stringify(note);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(note);
  }
  return out;
}

function taskList(map, id) {
  if (!map || typeof map !== "object") return [];
  const direct = map[id];
  const asString = map[String(id)];
  if (Array.isArray(direct)) return direct.slice();
  if (Array.isArray(asString)) return asString.slice();
  return [];
}

function followupRecord(map, id) {
  if (!map || typeof map !== "object") return null;
  return map[id] || map[String(id)] || null;
}

export function cleanupAuditNote(sourceId, sourceName, author, timestamp) {
  const name = String(sourceName || "").trim();
  return {
    author: author || "CRM",
    timestamp,
    tag: "cleanup",
    text: "Merged duplicate contact " + String(sourceId) + (name ? " (" + name + ")" : "") + " into this record."
  };
}

export function applyContactCleanup(state, archive, input) {
  const src = state && typeof state === "object" ? state : {};
  const sourceId = String(input && input.sourceId || "").trim();
  const keepId = String(input && input.keepId || "").trim();
  if (!sourceId || !keepId) return { ok: false, error: "Pick the keeper and the duplicate." };
  if (sourceId === keepId) return { ok: false, error: "Keeper and duplicate must be different contacts." };

  const added = Array.isArray(src.contactsAdded) ? src.contactsAdded : [];
  const book = Array.isArray(archive) ? archive : [];
  const source = contactById([added, book], sourceId);
  const keep = contactById([added, book], keepId);
  if (!source) return { ok: false, error: "Duplicate contact was not found." };
  if (!keep) return { ok: false, error: "Keeper contact was not found." };

  const reqs = src.archiveRequests && typeof src.archiveRequests === "object" ? Object.assign({}, src.archiveRequests) : {};
  if (isArchivedRow(source, reqs)) return { ok: false, error: "That duplicate is already archived." };
  if (isArchivedRow(keep, reqs)) return { ok: false, error: "The keeper is archived. Pick a live contact to keep." };

  const edits = src.contactEdits && typeof src.contactEdits === "object" ? Object.assign({}, src.contactEdits) : {};
  const keepOverlay = Object.assign({}, keep, edits[keepId] || edits[keep.id] || {});
  const sourceOverlay = Object.assign({}, source, edits[sourceId] || edits[source.id] || {});
  const filled = fillKeeperFromDuplicate(keepOverlay, sourceOverlay);
  filled.archived = keepOverlay.archived === true;
  edits[keepId] = filled;
  edits[sourceId] = Object.assign({}, sourceOverlay, {
    archived: true,
    folded: true,
    mergedAway: true,
    owner: "",
    mergedInto: keepId,
    duplicateOf: keepId
  });

  const author = String(input && input.author || "CRM").trim() || "CRM";
  const timestamp = String(input && input.timestamp || new Date().toISOString().slice(0, 16).replace("T", " "));
  const notes = src.notes && typeof src.notes === "object" && !Array.isArray(src.notes)
    ? Object.assign({}, src.notes)
    : {};
  notes[keepId] = mergeNoteLists(noteList(notes, keepId), noteList(notes, sourceId));
  const withAudit = mergeNoteOntoContact(notes, keepId, cleanupAuditNote(sourceId, sourceOverlay.name, author, timestamp));

  const completedTasks = src.completedTasks && typeof src.completedTasks === "object"
    ? Object.assign({}, src.completedTasks)
    : {};
  completedTasks[keepId] = [].concat(taskList(completedTasks, keepId), taskList(completedTasks, sourceId));

  const followups = src.followups && typeof src.followups === "object" ? Object.assign({}, src.followups) : {};
  const keepFu = followupRecord(followups, keepId);
  const sourceFu = followupRecord(followups, sourceId);
  if (!isLiveFollowup(keepFu) && isLiveFollowup(sourceFu)) {
    followups[keepId] = Object.assign({}, sourceFu);
  }

  const deals = Array.isArray(src.deals) ? src.deals.map((deal) => {
    if (!deal || String(deal.contactId) !== sourceId) return deal;
    return Object.assign({}, deal, {
      contactId: Number.isFinite(Number(keepId)) ? Number(keepId) : keepId,
      contactName: filled.name || deal.contactName
    });
  }) : [];

  const proposals = src.proposals && typeof src.proposals === "object" ? Object.assign({}, src.proposals) : {};
  const keepProps = [].concat(proposals[keepId] || proposals[Number(keepId)] || []);
  const sourceProps = [].concat(proposals[sourceId] || proposals[Number(sourceId)] || []);
  proposals[keepId] = keepProps.concat(sourceProps);

  reqs[sourceId] = {
    contactId: sourceId,
    name: sourceOverlay.name || "",
    company: sourceOverlay.company || "",
    owner: sourceOverlay.owner || "",
    requestedBy: author,
    requestedAt: timestamp,
    status: "approved",
    reviewedAt: timestamp,
    reviewedBy: author,
    reason: "duplicate",
    mergedInto: keepId
  };

  return {
    ok: true,
    keepId,
    sourceId,
    state: {
      deals,
      followups,
      notes: withAudit,
      contactsAdded: added,
      contactEdits: edits,
      proposals,
      archiveRequests: reqs,
      completedTasks
    }
  };
}
