export function completeFollowupKeys(current, contactId) {
  const merged = current && typeof current === "object" && !Array.isArray(current)
    ? Object.assign({}, current)
    : {};
  const want = String(contactId == null ? "" : contactId).trim();
  if (!want) return merged;
  for (const key of Object.keys(merged)) {
    if (String(key) === want) delete merged[key];
  }
  return merged;
}

export function isCompletedFollowup(value) {
  if (!value || typeof value !== "object") return false;
  return value.completed === true || value.clear === true || String(value.status || "").toLowerCase() === "completed";
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
    merged[key] = { nextAction: nextActionText, followUpDate: followUpDateText };
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
