const BACKUP_LATEST = "backup:latest";
const BACKUP_META = "backup:meta";

export function backupCounts(snap) {
  const edits = snap && snap.contactEdits && typeof snap.contactEdits === "object" ? snap.contactEdits : {};
  const notes = snap && snap.notes && typeof snap.notes === "object" ? snap.notes : {};
  const deals = Array.isArray(snap && snap.deals) ? snap.deals : [];
  const added = Array.isArray(snap && snap.contactsAdded) ? snap.contactsAdded : [];
  const followups = snap && snap.followups && typeof snap.followups === "object" ? snap.followups : {};
  return {
    contactEdits: Object.keys(edits).length,
    notes: Object.keys(notes).length,
    deals: deals.length,
    contactsAdded: added.length,
    followups: Object.keys(followups).length
  };
}

export function buildCrmSnapshot(state, at) {
  const stamp = at || new Date().toISOString();
  return {
    at: stamp,
    contactEdits: state && state.contactEdits && typeof state.contactEdits === "object" ? state.contactEdits : {},
    notes: state && state.notes && typeof state.notes === "object" ? state.notes : {},
    deals: Array.isArray(state && state.deals) ? state.deals : [],
    contactsAdded: Array.isArray(state && state.contactsAdded) ? state.contactsAdded : [],
    followups: state && state.followups && typeof state.followups === "object" ? state.followups : {},
    proposals: state && state.proposals && typeof state.proposals === "object" ? state.proposals : {}
  };
}

export async function writeCrmSnapshot(store, state, at) {
  const snap = buildCrmSnapshot(state, at);
  const day = String(snap.at).slice(0, 10);
  const meta = {
    at: snap.at,
    day,
    latestKey: BACKUP_LATEST,
    dayKey: "backup:" + day,
    counts: backupCounts(snap)
  };
  await Promise.all([
    store.setJSON(BACKUP_LATEST, snap),
    store.setJSON("backup:" + day, snap),
    store.setJSON(BACKUP_META, meta)
  ]);
  return meta;
}

export { BACKUP_LATEST, BACKUP_META };
