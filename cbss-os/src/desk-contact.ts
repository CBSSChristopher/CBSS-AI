import { titleOwner } from "./brand.ts";

export type DeskTrack = "cte" | "followup";

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
  track: DeskTrack;
  nextAction: string;
  followUpDate: string;
};

export type DeskTrackPlan = {
  track: DeskTrack;
  stage: "CTE in progress" | "Follow up in progress";
  nextAction: string;
  followUpDate: string;
  noteSuffix: string;
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
  status: "New Lead" | "CTE in progress" | "Follow up in progress";
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
    track: readDeskTrack(src),
    nextAction: clip(src.nextAction, 300),
    followUpDate: clip(src.followUpDate, 32),
  };
}

export function readDeskTrack(raw: Record<string, unknown>): DeskTrack {
  const v = String(raw.track || raw.kind || raw.mode || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (v === "followup" || v === "past" || v === "pastcte" || raw.pastCte === true) return "followup";
  return "cte";
}

export function deskTrackStage(track: DeskTrack): "CTE in progress" | "Follow up in progress" {
  return track === "followup" ? "Follow up in progress" : "CTE in progress";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function chicagoParts(now: Date): { y: number; m: number; d: number; h: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { y: num("year"), m: num("month"), d: num("day"), h: num("hour") };
}

function addDays(parts: { y: number; m: number; d: number }, days: number): { y: number; m: number; d: number } {
  const utc = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
}

function localWhen(parts: { y: number; m: number; d: number }, h: number, min = 0): string {
  return `${parts.y}-${pad(parts.m)}-${pad(parts.d)}T${pad(h)}:${pad(min)}`;
}

export function isDateTimeLocal(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || "").trim());
}

export function scheduleDeskTrack(
  draft: Pick<DeskContactDraft, "track" | "nextAction" | "followUpDate">,
  now = new Date(),
): DeskTrackPlan {
  const overrideWhen = isDateTimeLocal(draft.followUpDate) ? draft.followUpDate.trim() : "";
  const overrideAction = String(draft.nextAction || "").trim();
  if (draft.track === "followup") {
    const p = chicagoParts(now);
    const day = addDays(p, 2);
    const followUpDate = overrideWhen || localWhen(day, 9);
    const nextAction = overrideAction || "Follow up — next step after they connected";
    return {
      track: "followup",
      stage: "Follow up in progress",
      nextAction,
      followUpDate,
      noteSuffix: "Follow-up set: " + nextAction + " @ " + followUpDate.replace("T", " "),
    };
  }
  const p = chicagoParts(now);
  const callToday = p.h < 18;
  const callDay = callToday ? { y: p.y, m: p.m, d: p.d } : addDays(p, 1);
  const callHour = callToday ? Math.min(17, Math.max(p.h + 1, 10)) : 10;
  const textDay = addDays(callDay, 1);
  const emailDay = addDays(callDay, 2);
  const callWhen = overrideWhen || localWhen(callDay, callHour);
  const nextAction = overrideAction || "Call — first outreach";
  const lines = [
    "- CALL " + callWhen.replace("T", " ") + " — " + nextAction,
    "- TEXT " + localWhen(textDay, 10).replace("T", " ") + " — Text — short check-in if no connect",
    "- EMAIL " + localWhen(emailDay, 10).replace("T", " ") + " — Email — intro and ask for ZIP / site access",
  ];
  return {
    track: "cte",
    stage: "CTE in progress",
    nextAction,
    followUpDate: callWhen,
    noteSuffix: "CTE plan:\n" + lines.join("\n") + "\nCRM follow-up slot: " + nextAction + " @ " + callWhen.replace("T", " "),
  };
}

export function deskContactNote(notes: string, plan: DeskTrackPlan): string {
  const body = String(notes || "").trim();
  return body ? body + "\n\n" + plan.noteSuffix : plan.noteSuffix;
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
    status: deskTrackStage(draft.track),
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
