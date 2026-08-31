/** Slack so a phone clock a few minutes behind the CRM still reopens after complete. */
export const FOLLOWUP_CLOCK_SLACK_MS = 2 * 60 * 1000;

export type FollowupRow = {
  nextAction?: unknown;
  followUpDate?: unknown;
  completed?: unknown;
  clear?: unknown;
  status?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
};

export function isCompletedFollowup(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as FollowupRow;
  return row.completed === true || row.clear === true || String(row.status || "").toLowerCase() === "completed";
}

export function isLiveFollowup(value: unknown): boolean {
  if (!value || typeof value !== "object" || isCompletedFollowup(value)) return false;
  const row = value as FollowupRow;
  return Boolean(String(row.nextAction || "").trim() || String(row.followUpDate || "").trim());
}

export function followupUpdatedAt(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const row = value as FollowupRow;
  const n = Date.parse(String(row.updatedAt || row.completedAt || ""));
  return Number.isFinite(n) ? n : 0;
}

export function stampFollowupRow(row: FollowupRow, now = Date.now()): Record<string, unknown> {
  const nextAction = String(row.nextAction || "").trim();
  const followUpDate = String(row.followUpDate || "").trim();
  if (!nextAction && !followUpDate) {
    return {
      nextAction: "",
      followUpDate: "",
      completed: true,
      status: "completed",
      updatedAt: typeof row.updatedAt === "string" && row.updatedAt ? row.updatedAt : new Date(now).toISOString(),
    };
  }
  return {
    nextAction,
    followUpDate,
    completed: false,
    status: "open",
    updatedAt: new Date(now + FOLLOWUP_CLOCK_SLACK_MS).toISOString(),
  };
}

export function stampFollowupPatch(
  followups: Record<string, unknown>,
  now = Date.now(),
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(followups || {})) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    out[key] = stampFollowupRow(value as FollowupRow, now);
  }
  return out;
}

export function rewriteCrmWrite(
  action: string,
  body: Record<string, unknown>,
  now = Date.now(),
): Record<string, unknown> {
  if (action !== "saveFollowups") return body;
  const followups = body.followups;
  if (!followups || typeof followups !== "object" || Array.isArray(followups)) return body;
  return { ...body, followups: stampFollowupPatch(followups as Record<string, unknown>, now) };
}

/**
 * Live CRM `applyFollowupPatch` (crmBuild 23). A completed row only reopens when
 * the incoming patch has an updatedAt that is not older than the tombstone.
 * Missing updatedAt is dropped — that is why The Yard used to lose the next one.
 */
export function applyLiveCrmFollowupPatch(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  now = Date.now(),
): Record<string, unknown> {
  const merged: Record<string, unknown> = current && typeof current === "object" && !Array.isArray(current)
    ? { ...current }
    : {};
  const src = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
  for (const key of Object.keys(src)) {
    const value = src[key];
    if (!value || typeof value !== "object") continue;
    const row = value as FollowupRow;
    if (isCompletedFollowup(row)) {
      for (const existing of Object.keys(merged)) {
        if (String(existing) === String(key)) delete merged[existing];
      }
      merged[String(key)] = {
        nextAction: "",
        followUpDate: "",
        completed: true,
        status: "completed",
        updatedAt: row.updatedAt || row.completedAt || new Date(now).toISOString(),
      };
      continue;
    }
    const prev = (merged[key] || merged[String(key)] || {}) as FollowupRow;
    const nextAction = row.nextAction !== undefined ? row.nextAction : prev.nextAction;
    const followUpDate = row.followUpDate !== undefined ? row.followUpDate : prev.followUpDate;
    const nextActionText = String(nextAction || "").trim();
    const followUpDateText = String(followUpDate || "").trim();
    const prevAction = String(prev.nextAction || "").trim();
    const prevDate = String(prev.followUpDate || "").trim();
    if (!nextActionText && !followUpDateText && (prevAction || prevDate)) {
      merged[key] = prev;
      continue;
    }
    if (isCompletedFollowup(prev) && (nextActionText || followUpDateText)) {
      const incomingTs = followupUpdatedAt(row);
      const prevTs = followupUpdatedAt(prev);
      if (!incomingTs || incomingTs < prevTs) continue;
    }
    merged[key] = {
      nextAction: nextActionText,
      followUpDate: followUpDateText,
      updatedAt: row.updatedAt || new Date(now).toISOString(),
    };
  }
  return merged;
}
