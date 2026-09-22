import { titleOwner } from "../brand.ts";
import { addBusinessDays, chicagoNow, dueIso, dueReached, nextBusinessDayOnOrAfter, parseCivil } from "../cycle/business-days.ts";
import { isCompletedFollowup } from "../followups.ts";
import { normalizeStage } from "../stages.ts";
import { buildReadyToBuyNote, readHarborDeal, type HarborDealFields } from "./close-note.ts";
import { isDoNotTouch, phoneDigits } from "./match.ts";
import { hardNoSpoken, pickReadyToBuyLine, softDelaySpoken, voicemailScript } from "./scripts.ts";

export const HARBOR_OWNER = "Harbor";
export const POOL_OWNER = "New/Unassigned";
export const IMPORT_STAGE = "New";
export const META_CSV_SOURCE = "facebook_lead_ads";
export const META_CSV_METHOD = "meta_csv";

export const HUMAN_CLOSERS = ["Christopher Banks", "Bryan Reese"] as const;
export type HumanCloser = (typeof HUMAN_CLOSERS)[number];

export const CTE_STEPS = ["CTE1", "CTE2", "CTE3", "CTE4"] as const;
export type CteStep = (typeof CTE_STEPS)[number];

export const HARBOR_OUTCOMES = [
  "no-answer",
  "voicemail",
  "answered",
  "callback",
  "soft-delay",
  "ready-to-buy",
  "inbound-answered",
  "inbound-message",
  "inbound-ready-to-buy",
  "not-interested",
  "bought-elsewhere",
  "DNC",
  "wrong-number",
] as const;
export type HarborOutcome = (typeof HARBOR_OUTCOMES)[number];

const OUTCOME_ALIASES: Record<string, HarborOutcome> = {
  "no-answer": "no-answer",
  no_answer: "no-answer",
  "no answer": "no-answer",
  unanswered: "no-answer",
  voicemail: "voicemail",
  vm: "voicemail",
  answered: "answered",
  connected: "answered",
  "did answer": "answered",
  callback: "callback",
  "call back": "callback",
  "soft-delay": "soft-delay",
  "soft delay": "soft-delay",
  later: "soft-delay",
  "talk to wife": "soft-delay",
  "call tomorrow": "soft-delay",
  "send more info": "soft-delay",
  "not ready": "soft-delay",
  "keep in loop": "soft-delay",
  "ready-to-buy": "ready-to-buy",
  "ready to buy": "ready-to-buy",
  handoff: "ready-to-buy",
  "inbound-answered": "inbound-answered",
  "inbound answered": "inbound-answered",
  inbound: "inbound-answered",
  "they called back": "inbound-answered",
  "inbound-message": "inbound-message",
  "inbound message": "inbound-message",
  "inbound-ready-to-buy": "inbound-ready-to-buy",
  "inbound ready to buy": "inbound-ready-to-buy",
  "not-interested": "not-interested",
  "not interested": "not-interested",
  "bought-elsewhere": "bought-elsewhere",
  "bought elsewhere": "bought-elsewhere",
  bought: "bought-elsewhere",
  "already bought": "bought-elsewhere",
  dnc: "DNC",
  "do not call": "DNC",
  "wrong-number": "wrong-number",
  "wrong number": "wrong-number",
  "bad number": "wrong-number",
};

export function normalizeHarborOutcome(raw: unknown): HarborOutcome | "" {
  return OUTCOME_ALIASES[String(raw || "").trim().toLowerCase()] || "";
}

export function isHarborOwner(value: unknown): boolean {
  return titleOwner(String(value || "")) === HARBOR_OWNER;
}

export function isUnassignedPool(value: unknown): boolean {
  return titleOwner(String(value || "")) === POOL_OWNER || !titleOwner(String(value || ""));
}

export function resolveCloser(raw: unknown): HumanCloser {
  const titled = titleOwner(String(raw || ""));
  if (titled === "Bryan Reese") return "Bryan Reese";
  return "Christopher Banks";
}

export function normalizeCteStep(raw: unknown): CteStep {
  const key = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
  if (key === "CTE2") return "CTE2";
  if (key === "CTE3") return "CTE3";
  if (key === "CTE4") return "CTE4";
  return "CTE1";
}

export function nextCteStep(current: unknown): CteStep {
  const now = normalizeCteStep(current);
  if (now === "CTE1") return "CTE2";
  if (now === "CTE2") return "CTE3";
  if (now === "CTE3") return "CTE4";
  return "CTE4";
}

export function isHardNoOutcome(outcome: HarborOutcome | ""): boolean {
  return outcome === "not-interested" || outcome === "DNC" || outcome === "wrong-number" || outcome === "bought-elsewhere";
}

export function isSoftDelayOutcome(outcome: HarborOutcome | ""): boolean {
  return outcome === "soft-delay" || outcome === "callback";
}

export function isReadyToBuyOutcome(outcome: HarborOutcome | ""): boolean {
  return outcome === "ready-to-buy" || outcome === "inbound-ready-to-buy";
}

export function isFixtureContact(contact: Record<string, unknown> | null | undefined): boolean {
  if (!contact) return false;
  const source = String(contact.source || "").trim().toLowerCase();
  if (source === "test" || source === "fixture" || source === "demo") return true;
  const name = String(contact.name || "").trim();
  if (/^test[-_]/i.test(name) || /^fixture\b/i.test(name)) return true;
  const leadId = String(contact.facebookLeadId || contact.leadId || "").trim();
  if (/^test[-_]/i.test(leadId) || leadId.toLowerCase() === "test-lead") return true;
  return contact.__fixture === true || contact.fixture === true;
}

export function isCallableHarborLead(contact: Record<string, unknown> | null | undefined): boolean {
  if (!contact) return false;
  if (isFixtureContact(contact)) return false;
  if (isDoNotTouch(contact)) return false;
  if (!phoneDigits(contact.phone || contact.mobile)) return false;
  return isUnassignedPool(contact.owner);
}

export type HarborQueueSource = "follow-up" | "new-unassigned";

export type HarborQueueHit = {
  contact: Record<string, unknown>;
  source: HarborQueueSource;
};

export type HarborQueueOpts = {
  followups?: Record<string, unknown> | null;
  now?: Date;
};

function followupMap(raw: unknown): Record<string, Record<string, unknown>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, row] of Object.entries(raw as Record<string, unknown>)) {
    if (row && typeof row === "object") out[id] = row as Record<string, unknown>;
  }
  return out;
}

export function attachHarborFollowup(
  contact: Record<string, unknown>,
  followups?: Record<string, unknown> | null,
): Record<string, unknown> {
  const id = String(contact.id || "");
  const bag = followupMap(followups);
  const row = bag[id] || bag[String(contact.id || "")];
  if (!row) return contact;
  if (isCompletedFollowup(row) && !String(contact.followUpDate || "").trim()) {
    return { ...contact, __followupCompleted: true };
  }
  return {
    ...contact,
    followUpDate: contact.followUpDate || row.followUpDate,
    nextAction: contact.nextAction || row.nextAction,
  };
}

export function isHarborDueFollowUp(
  contact: Record<string, unknown> | null | undefined,
  now = new Date(),
): boolean {
  if (!contact) return false;
  if (isFixtureContact(contact)) return false;
  if (isDoNotTouch(contact)) return false;
  if (!phoneDigits(contact.phone || contact.mobile)) return false;
  if (!isHarborOwner(contact.owner)) return false;
  if (contact.__followupCompleted === true) return false;
  const when = String(contact.followUpDate || contact.follow_up_date || "").trim();
  if (when) return dueReached(when, now);
  return normalizeStage(contact.status) === "Follow-up";
}

export function listHarborQueue(contacts: unknown, opts: HarborQueueOpts = {}): {
  due: Record<string, unknown>[];
  pool: Record<string, unknown>[];
} {
  const rows = Array.isArray(contacts) ? contacts : [];
  const now = opts.now || new Date();
  const due: Record<string, unknown>[] = [];
  const pool: Record<string, unknown>[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const contact = attachHarborFollowup(row as Record<string, unknown>, opts.followups);
    if (isHarborDueFollowUp(contact, now)) due.push(contact);
    else if (isCallableHarborLead(contact)) pool.push(contact);
  }
  due.sort((a, b) => String(a.followUpDate || "").localeCompare(String(b.followUpDate || "")));
  return { due, pool };
}

export function pickHarborQueue(contacts: unknown, opts: HarborQueueOpts = {}): HarborQueueHit | null {
  const { due, pool } = listHarborQueue(contacts, opts);
  if (due[0]) return { contact: due[0], source: "follow-up" };
  if (pool[0]) return { contact: pool[0], source: "new-unassigned" };
  return null;
}

/** New/Unassigned first-call pile, then due Harbor follow-ups (due wins). */
export function pickHarborNext(contacts: unknown, opts: HarborQueueOpts = {}): Record<string, unknown> | null {
  return pickHarborQueue(contacts, opts)?.contact || null;
}

export function harborAssignPatch(
  cte: CteStep = "CTE1",
  source: HarborQueueSource = "new-unassigned",
): Record<string, unknown> {
  const track = source === "follow-up" ? "follow-up" : "outbound";
  return {
    owner: HARBOR_OWNER,
    status: "Working",
    cteStage: cte,
    nextAction: cte + " — Harbor " + track + " (dial parked until VA_DIAL_ARMED)",
  };
}

export function resolveHarborFollowUpAt(raw: unknown, now = new Date()): string {
  const text = String(raw || "").trim();
  const parsed = parseCivil(text);
  if (parsed) {
    const day = nextBusinessDayOnOrAfter(parsed);
    const hm = text.match(/T(\d{2}):(\d{2})/);
    return dueIso(day, hm ? Number(hm[1]) : 10, hm ? Number(hm[2]) : 0);
  }
  return dueIso(addBusinessDays(chicagoNow(now).civil, 1));
}

export type HarborOutcomeOpts = {
  closer?: unknown;
  note?: string;
  cte?: unknown;
  inbound?: boolean;
  reason?: unknown;
  followUpDate?: unknown;
  deal?: HarborDealFields;
  spoken?: unknown;
  harborDid?: unknown;
  container?: unknown;
  now?: Date;
};

export type HarborOutcomePlan = {
  outcome: HarborOutcome | "";
  owner: string;
  status: string;
  cteStage: CteStep;
  closer: HumanCloser;
  note: string;
  handoff: boolean;
  inbound: boolean;
  softDelay: boolean;
  hardNo: boolean;
  followUp: boolean;
  nextAction: string;
  followUpDate: string;
  spoken: string;
};

export function harborOutcomePlan(
  contact: Record<string, unknown>,
  rawOutcome: unknown,
  opts: HarborOutcomeOpts = {},
): HarborOutcomePlan {
  let outcome = normalizeHarborOutcome(rawOutcome);
  if (opts.inbound && outcome === "ready-to-buy") outcome = "inbound-ready-to-buy";
  if (opts.inbound && outcome === "answered") outcome = "inbound-answered";
  const currentCte = normalizeCteStep(contact.cteStage || opts.cte || "CTE1");
  const closer = resolveCloser(opts.closer);
  const extra = String(opts.note || "").trim();
  const reason = String(opts.reason || extra || "").trim();
  const inbound = Boolean(opts.inbound) || outcome.startsWith("inbound-");
  const deal = opts.deal || readHarborDeal({});
  const now = opts.now || new Date();
  let owner = titleOwner(String(contact.owner || "")) || HARBOR_OWNER;
  let status = normalizeStage(contact.status) || "Working";
  let cteStage = currentCte;
  let handoff = false;
  let softDelay = false;
  let hardNo = false;
  let followUp = false;
  let nextAction = "";
  let followUpDate = "";
  let spoken = "";
  let line = "";

  if (outcome === "no-answer" || outcome === "voicemail") {
    cteStage = nextCteStep(currentCte);
    status = "Working";
    owner = HARBOR_OWNER;
    if (outcome === "voicemail") {
      spoken = voicemailScript({
        name: contact.name,
        company: contact.company,
        container: opts.container || deal.size || contact.container || contact.size,
        harborDid: opts.harborDid,
      });
      line =
        "Harbor · CTE " +
        currentCte +
        " · Voicemail left. Next " +
        cteStage +
        ". No stuck card.\nCallback: Harbor DID only — never Christopher personal cell.\nScript: " +
        spoken;
    } else {
      line = "Harbor · CTE " + currentCte + " · No answer. Next " + cteStage + ". Move to the next lead.";
    }
  } else if (outcome === "answered") {
    status = "Working";
    owner = HARBOR_OWNER;
    cteStage = currentCte;
    line = "Harbor · CTE " + currentCte + " · They answered. Sales conversation on this card. Harbor does not take payment.";
  } else if (outcome === "inbound-answered") {
    status = "Working";
    owner = HARBOR_OWNER;
    cteStage = currentCte;
    line =
      "Harbor inbound · CTE " +
      currentCte +
      " · They called the Harbor line. Same qualification. Not solid yet — Harbor handles, notes, stays on this card.";
  } else if (outcome === "inbound-message") {
    status = "Follow-up";
    owner = HARBOR_OWNER;
    softDelay = true;
    followUp = true;
    followUpDate = resolveHarborFollowUpAt(opts.followUpDate, now);
    nextAction = "Harbor inbound message — stay on queue";
    spoken = softDelaySpoken("the next business day");
    line =
      "Harbor inbound · CTE " +
      currentCte +
      " · They left a message / not ready to close. Soft delay. Follow-up " +
      followUpDate +
      ". Stay on Harbor. Do not close-out or DNC.";
  } else if (isSoftDelayOutcome(outcome)) {
    status = "Follow-up";
    owner = HARBOR_OWNER;
    softDelay = true;
    followUp = true;
    followUpDate = resolveHarborFollowUpAt(opts.followUpDate, now);
    nextAction = "Harbor soft delay" + (reason ? " — " + reason.slice(0, 160) : " — keep in loop");
    spoken = softDelaySpoken(followUpDate);
    line =
      "Harbor · CTE " +
      currentCte +
      " · Soft delay" +
      (reason ? " (" + reason.slice(0, 160) + ")" : "") +
      ". Follow-up " +
      followUpDate +
      ". Stay on Harbor queue. Do not close-out or DNC.";
    if (outcome === "callback") {
      line =
        "Harbor · CTE " +
        currentCte +
        " · Callback booked. Stay on Harbor until they pick up or ready-to-buy.\nFollow-up " +
        followUpDate +
        ".";
    }
  } else if (isReadyToBuyOutcome(outcome)) {
    status = "Ready to buy";
    owner = closer;
    handoff = true;
    cteStage = currentCte;
    const pick = pickReadyToBuyLine(opts.spoken, now.getTime());
    spoken = pick.spoken;
    line = buildReadyToBuyNote({
      cte: currentCte,
      closer,
      inbound: inbound || outcome === "inbound-ready-to-buy",
      spoken: pick,
      deal,
      extra,
    });
  } else if (isHardNoOutcome(outcome)) {
    hardNo = true;
    spoken = hardNoSpoken();
    if (outcome === "not-interested") {
      status = "Not interested";
      line = "Harbor · CTE " + currentCte + " · Not interested. Card closed. Next lead.";
    } else if (outcome === "DNC") {
      status = "DNC";
      line = "Harbor · CTE " + currentCte + " · DNC. Do not call again.";
    } else if (outcome === "wrong-number") {
      status = "Email campaign";
      line = "Harbor · CTE " + currentCte + " · Wrong number. Off the dial queue.";
    } else {
      status = "Bought elsewhere";
      line = "Harbor · CTE " + currentCte + " · Bought elsewhere. Polite close-out. No follow-up. Next lead.";
    }
  } else {
    line = "Harbor · CTE " + currentCte + " · Need a call outcome.";
  }

  const note = isReadyToBuyOutcome(outcome) ? line : [line, extra].filter(Boolean).join("\n");
  return {
    outcome,
    owner,
    status,
    cteStage,
    closer,
    note,
    handoff,
    inbound: inbound || outcome.startsWith("inbound-"),
    softDelay,
    hardNo,
    followUp,
    nextAction,
    followUpDate,
    spoken,
  };
}

export function harborAssignNote(cte: CteStep = "CTE1", source: HarborQueueSource = "new-unassigned"): string {
  if (source === "follow-up") {
    return (
      "Harbor pulled a due follow-up and is working it like a sales rep. " +
      cte +
      " stays open. Dial stays parked until Christopher arms VA_DIAL_ARMED."
    );
  }
  return (
    "Harbor pulled this card off New/Unassigned and self-assigned. " +
    cte +
    " is open. Standard Yard CTE cadence (CTE1 call one → CTE2 → CTE3 → CTE4). Dial stays parked until Christopher arms VA_DIAL_ARMED."
  );
}

export function harborOutcomeEdits(plan: HarborOutcomePlan): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    owner: plan.owner,
    status: plan.status,
    cteStage: plan.cteStage,
  };
  if (plan.followUp) {
    patch.nextAction = plan.nextAction;
    patch.followUpDate = plan.followUpDate;
  }
  if (plan.hardNo) {
    patch.nextAction = "";
    patch.followUpDate = "";
  }
  return patch;
}

export function harborFollowupRow(plan: HarborOutcomePlan): Record<string, unknown> | null {
  if (plan.followUp) {
    return { nextAction: plan.nextAction, followUpDate: plan.followUpDate, completed: false, status: "open" };
  }
  if (plan.hardNo) {
    return { nextAction: "", followUpDate: "", completed: true, status: "completed" };
  }
  return null;
}
