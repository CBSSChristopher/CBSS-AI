export type CteChannel = "call" | "text" | "email";

export type CteItem = {
  channel: CteChannel;
  when: string;
  label: string;
};

export type LiveCallSchedule = {
  pastCte: boolean;
  ctePlan: CteItem[];
  nextAction: string;
  followUpDate: string;
  noteSuffix: string;
};

export type LiveCallDraft = {
  summary: string;
  crmNote: string;
  pastCte: boolean;
  nextAction: string;
  followUpDate: string;
};

const TZ = "America/Chicago";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function chicagoParts(now = new Date()): {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { y: num("year"), m: num("month"), d: num("day"), h: num("hour"), min: num("minute") };
}

export function dateTimeLocal(y: number, m: number, d: number, h: number, min: number): string {
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
}

export function addCalendarDays(parts: { y: number; m: number; d: number }, days: number): {
  y: number;
  m: number;
  d: number;
} {
  const utc = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
}

export function isDateTimeLocal(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || "").trim());
}

export function planCteSequence(now = new Date()): CteItem[] {
  const p = chicagoParts(now);
  const callToday = p.h < 18;
  const callDay = callToday ? { y: p.y, m: p.m, d: p.d } : addCalendarDays(p, 1);
  const callHour = callToday ? Math.min(17, Math.max(p.h + 1, 10)) : 10;
  const textDay = addCalendarDays(callDay, 1);
  const emailDay = addCalendarDays(callDay, 2);
  return [
    {
      channel: "call",
      when: dateTimeLocal(callDay.y, callDay.m, callDay.d, callHour, 0),
      label: "Call — first outreach / finish this conversation",
    },
    {
      channel: "text",
      when: dateTimeLocal(textDay.y, textDay.m, textDay.d, 10, 0),
      label: "Text — short check-in if no connect",
    },
    {
      channel: "email",
      when: dateTimeLocal(emailDay.y, emailDay.m, emailDay.d, 10, 0),
      label: "Email — intro and ask for ZIP / site access",
    },
  ];
}

export function nextFollowupAfterCte(now = new Date(), days = 2): string {
  const p = chicagoParts(now);
  const day = addCalendarDays(p, days);
  return dateTimeLocal(day.y, day.m, day.d, 9, 0);
}

export function scheduleLiveCall(opts: {
  now?: Date;
  pastCte: boolean;
  nextAction?: string;
  followUpDate?: string;
}): LiveCallSchedule {
  const now = opts.now || new Date();
  const pastCte = Boolean(opts.pastCte);
  const overrideWhen = isDateTimeLocal(opts.followUpDate || "") ? String(opts.followUpDate).trim() : "";
  const overrideAction = String(opts.nextAction || "").trim();

  if (pastCte) {
    const followUpDate = overrideWhen || nextFollowupAfterCte(now, 2);
    const nextAction = overrideAction || "Follow up — quote / proposal / next step after they connected";
    return {
      pastCte: true,
      ctePlan: [],
      nextAction,
      followUpDate,
      noteSuffix: `Past CTE. Follow-up set: ${nextAction} @ ${followUpDate.replace("T", " ")}`,
    };
  }

  const ctePlan = planCteSequence(now);
  if (overrideWhen) ctePlan[0] = { ...ctePlan[0], when: overrideWhen };
  const nextAction = overrideAction || ctePlan[0].label;
  const followUpDate = ctePlan[0].when;
  const lines = ctePlan.map((item) => `- ${item.channel.toUpperCase()} ${item.when.replace("T", " ")} — ${item.label}`);
  return {
    pastCte: false,
    ctePlan,
    nextAction,
    followUpDate,
    noteSuffix: `CTE plan:\n${lines.join("\n")}\nCRM follow-up slot: ${nextAction} @ ${followUpDate.replace("T", " ")}`,
  };
}

export function parseLiveCallDraft(raw: string, scraps: string, pastCte: boolean): LiveCallDraft {
  const text = String(raw || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let parsed: Record<string, unknown> = {};
  if (start >= 0 && end > start) {
    try {
      parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  const summary = String(parsed.summary || "").trim() || "Live call captured. Review the CRM note.";
  const crmNote = String(parsed.crmNote || parsed.note || "").trim() || fallbackNote(scraps);
  const aiPast = parsed.pastCte;
  const resolvedPast = typeof aiPast === "boolean" ? aiPast : pastCte;
  return {
    summary,
    crmNote,
    pastCte: resolvedPast,
    nextAction: String(parsed.nextAction || "").trim(),
    followUpDate: String(parsed.followUpDate || "").trim(),
  };
}

export function fallbackNote(scraps: string): string {
  const body = String(scraps || "").trim() || "NEED: call scraps";
  return [
    "Live call",
    `What they said:\n${body}`,
    "Size / grade: NEED",
    "ZIP / site: NEED",
    "Price given by Christopher (if any): NEED",
    "Next action: NEED",
  ].join("\n");
}

export function liveCallPrompt(input: {
  scraps: string;
  pastCte: boolean;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  zip?: string;
  stage?: string;
}): string {
  return [
    "Live call desk job. Return ONLY JSON. No markdown. No prices unless the scraps already contain a dollar amount the rep or Christopher typed.",
    "CTE means Call, then Text, then Email — first outreach when they have not really connected yet.",
    "pastCte=true only if they answered, want a quote/proposal, or are already past first outreach.",
    "JSON shape:",
    '{"summary":"2-4 sentences for the rep","crmNote":"tight CRM note with facts and NEED for missing fields","pastCte":false,"nextAction":"short CRM next action","followUpDate":"YYYY-MM-DDTHH:MM or empty"}',
    `Rep marked past CTE: ${input.pastCte ? "yes" : "no"}`,
    `Contact: ${input.contactName || "NEED"}`,
    `Phone: ${input.phone || "NEED"}`,
    `Email: ${input.email || "NEED"}`,
    `City / ZIP: ${input.city || "NEED"} ${input.zip || ""}`.trim(),
    `Current stage: ${input.stage || "NEED"}`,
    `Live scraps:\n${input.scraps}`,
  ].join("\n");
}
