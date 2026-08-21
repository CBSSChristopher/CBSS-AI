export function followupNow() {
  return new Date().toISOString();
}

export function followupUpdatedAt(value) {
  if (!value || typeof value !== "object") return 0;
  const n = Date.parse(String(value.updatedAt || value.completedAt || ""));
  return Number.isFinite(n) ? n : 0;
}

export function followupTombstone(at) {
  return {
    nextAction: "",
    followUpDate: "",
    completed: true,
    status: "completed",
    updatedAt: at || followupNow()
  };
}

export function isCompletedFollowup(value) {
  if (!value || typeof value !== "object") return false;
  return value.completed === true || value.clear === true || String(value.status || "").toLowerCase() === "completed";
}

export function isLiveFollowup(value) {
  if (!value || typeof value !== "object" || isCompletedFollowup(value)) return false;
  return Boolean(String(value.nextAction || "").trim() || String(value.followUpDate || "").trim());
}

export function completeFollowupKeys(current, contactId) {
  const merged = current && typeof current === "object" && !Array.isArray(current)
    ? Object.assign({}, current)
    : {};
  const want = String(contactId == null ? "" : contactId).trim();
  if (!want) return merged;
  for (const key of Object.keys(merged)) {
    if (String(key) === want) delete merged[key];
  }
  merged[want] = followupTombstone();
  return merged;
}

export function clearFollowupEdits(edits, contactId) {
  const next = edits && typeof edits === "object" && !Array.isArray(edits)
    ? Object.assign({}, edits)
    : {};
  const want = String(contactId == null ? "" : contactId).trim();
  if (!want) return next;
  let wrote = false;
  for (const key of Object.keys(next)) {
    if (String(key) !== want) continue;
    next[key] = Object.assign({}, next[key] || {}, { nextAction: "", followUpDate: "" });
    wrote = true;
  }
  if (!wrote) next[want] = { nextAction: "", followUpDate: "" };
  return next;
}

const KNOWN_CRM_ACTIONS = new Set([
  "get",
  "getNotes",
  "completeFollowup",
  "saveFollowups",
  "saveArchiveRequests",
  "saveDeals",
  "saveNotes",
  "saveContactsAdded",
  "saveContactEdits",
  "saveProposals",
  "ingestProposal",
  "importDeals",
  "importContacts",
  "getMetaStatus",
  "saveMetaConfig",
  "connectMeta",
  "importMetaLeads",
  "cleanupContact",
  "cleanupContacts"
]);

export function resolveCrmAction(method, urlAction, body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  let action = String(urlAction || src.action || "get").trim() || "get";
  const contactId = String(src.contactId || src.id || "").trim();
  const looksLikeLegacyComplete = String(method || "").toUpperCase() === "POST"
    && Boolean(contactId)
    && !KNOWN_CRM_ACTIONS.has(action)
    && !src.followups
    && !src.deals
    && !src.notes
    && !src.proposal
    && !src.contacts
    && !src.archiveRequests
    && !src.contactEdits
    && !src.contactsAdded;
  if (looksLikeLegacyComplete) {
    if (!src.nextAction) src.nextAction = action;
    action = "completeFollowup";
  }
  return { action, body: src };
}

export function completedActionText(body) {
  const src = body && typeof body === "object" ? body : {};
  const text = String(src.nextAction || src.completedAction || "").trim();
  return text || "Follow-up";
}

export function applyFollowupPatch(current, incoming) {
  const merged = current && typeof current === "object" && !Array.isArray(current)
    ? Object.assign({}, current)
    : {};
  const src = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
  for (const key of Object.keys(src)) {
    const value = src[key];
    if (!value || typeof value !== "object") continue;
    if (isCompletedFollowup(value)) {
      for (const existing of Object.keys(merged)) {
        if (String(existing) === String(key)) delete merged[existing];
      }
      merged[String(key)] = followupTombstone(value.updatedAt || value.completedAt);
      continue;
    }
    const prev = merged[key] || merged[String(key)] || {};
    const nextAction = value.nextAction !== undefined ? value.nextAction : prev.nextAction;
    const followUpDate = value.followUpDate !== undefined ? value.followUpDate : prev.followUpDate;
    const nextActionText = String(nextAction || "").trim();
    const followUpDateText = String(followUpDate || "").trim();
    const prevAction = String(prev.nextAction || "").trim();
    const prevDate = String(prev.followUpDate || "").trim();
    if (!nextActionText && !followUpDateText && (prevAction || prevDate)) {
      merged[key] = prev;
      continue;
    }
    if (isCompletedFollowup(prev) && (nextActionText || followUpDateText)) {
      const incomingTs = followupUpdatedAt(value);
      const prevTs = followupUpdatedAt(prev);
      if (!incomingTs || incomingTs < prevTs) continue;
    }
    merged[key] = {
      nextAction: nextActionText,
      followUpDate: followUpDateText,
      updatedAt: value.updatedAt || followupNow()
    };
  }
  return merged;
}

export function completionNote(action, author, timestamp) {
  const text = String(action || "Follow-up").trim() || "Follow-up";
  return {
    author: String(author || "User").trim() || "User",
    timestamp: String(timestamp || "").trim(),
    tag: "Task",
    text: "Completed: " + text
  };
}

export function completedTaskRecord(action, author, timestamp) {
  return {
    text: String(action || "Follow-up").trim() || "Follow-up",
    author: String(author || "User").trim() || "User",
    timestamp: String(timestamp || "").trim(),
    status: "completed"
  };
}

export function recordCompletedTask(current, contactId, task) {
  const next = current && typeof current === "object" && !Array.isArray(current)
    ? Object.assign({}, current)
    : {};
  const key = String(contactId == null ? "" : contactId).trim();
  if (!key || !task) return next;
  const existing = Array.isArray(next[key])
    ? next[key].slice()
    : Array.isArray(next[contactId])
      ? next[contactId].slice()
      : [];
  existing.unshift(task);
  next[key] = existing;
  return next;
}

export function applyCompleteFollowupState(state, contactId, actionText, author, timestamp) {
  const src = state && typeof state === "object" ? state : {};
  return {
    followups: completeFollowupKeys(src.followups, contactId),
    contactEdits: clearFollowupEdits(src.contactEdits, contactId),
    notes: mergeNoteOntoContact(src.notes, contactId, completionNote(actionText, author, timestamp)),
    completedTasks: recordCompletedTask(src.completedTasks, contactId, completedTaskRecord(actionText, author, timestamp))
  };
}

export function mergeNotesMap(existing, incoming) {
  const out = {};
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    for (const [key, value] of Object.entries(existing)) {
      if (Array.isArray(value)) out[String(key)] = value;
    }
  }
  if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
    for (const [key, value] of Object.entries(incoming)) {
      if (Array.isArray(value)) out[String(key)] = value;
    }
  }
  return out;
}

export function mergeNoteOntoContact(notes, contactId, note) {
  const next = notes && typeof notes === "object" && !Array.isArray(notes)
    ? Object.assign({}, notes)
    : {};
  const key = String(contactId);
  const existing = Array.isArray(next[key])
    ? next[key].slice()
    : Array.isArray(next[contactId])
      ? next[contactId].slice()
      : [];
  existing.unshift(note);
  next[key] = existing;
  return next;
}
