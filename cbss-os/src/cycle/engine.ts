import { chicagoBusinessHours, chicagoNow, civilKey } from "./business-days.ts";
import { agentMailReady, listInboxMessages, sendAgentMail } from "./agentmail.ts";
import { applyNoAnswerSchedule, applyOverride, dueTemplates, holidayExtras, nextOpenDue } from "./ladder.ts";
import {
  emptyRecord,
  pushAlert,
  pushEvent,
  readRecord,
  readIndex,
  readUsers,
  recordsByThread,
  writeRecord,
  type CycleRecord,
} from "./store.ts";
import { firstNameOf, officeCopy, resolveAssignedRep, rosterPhone, rosterTitle, type ActiveUser } from "./rep.ts";
import { isExit, legacyStatusFor, normalizeLifecycle, type Lifecycle } from "./lifecycle.ts";
import { REENGAGE_TEMPLATE_IDS, renderTemplate, type TemplateId } from "./templates.ts";
import { loadNextStepsPdf } from "../../../cbss-invoice/src/next-steps-pdf.ts";

const SEND_WHEN_STOPPED: TemplateId[] = ["paid", "bad_number", ...REENGAGE_TEMPLATE_IDS];
const CTE_TEMPLATE_IDS: TemplateId[] = ["cte1", "cte2", "cte3", "cte4"];

export type CycleEnv = {
  SESSIONS?: KVNamespace;
  AGENTMAIL_API_KEY?: string;
  AGENTMAIL_INBOX?: string;
  US_HOLIDAY_EXTRA?: string;
  REENGAGE_EMAILS_ENABLED?: string;
  /** Deprecated. Paid Next Steps never attaches by URL. */
  NEXT_STEPS_PDF_URL?: string;
  ASSETS?: Fetcher;
};

export type ContactHint = {
  id: string;
  name?: string;
  email?: string;
  owner?: string;
  status?: string;
  lifecycle?: string;
};

const CTE_STAGE: Record<string, CycleRecord["cteStage"]> = {
  cte1: "CTE1",
  cte2: "CTE2",
  cte3: "CTE3",
  cte4: "CTE4",
};

function reengageOn(env: CycleEnv): boolean {
  return String(env.REENGAGE_EMAILS_ENABLED || "").trim().toLowerCase() === "true";
}

export function publicCycle(rec: CycleRecord | null) {
  if (!rec) return null;
  return {
    contactId: rec.contactId,
    lifecycle: rec.lifecycle,
    owner: rec.owner,
    ownerEmail: rec.ownerEmail,
    cteStage: rec.cteStage,
    nextDue: rec.nextDue,
    stopped: rec.stopped,
    stoppedReason: rec.stoppedReason,
    paused: rec.paused,
    pauseReason: rec.pauseReason,
    overrideAt: rec.overrideAt,
    events: rec.events,
    sends: rec.sends,
  };
}

async function loadOrCreate(env: CycleEnv, hint: ContactHint): Promise<CycleRecord> {
  const rec = (await readRecord(env, hint.id)) || emptyRecord(hint.id);
  rec.clientName = String(hint.name || rec.clientName || "").trim();
  rec.clientEmail = String(hint.email || rec.clientEmail || "").trim().toLowerCase();
  rec.owner = String(hint.owner || rec.owner || "").trim();
  if (!rec.lifecycle) rec.lifecycle = normalizeLifecycle(hint.lifecycle, hint.status);
  return rec;
}

export function applyRepGate(
  rec: CycleRecord,
  users: ActiveUser[],
  opts: { allowRoster?: boolean } = {},
): CycleRecord {
  const resolved = resolveAssignedRep(rec.owner, users, opts);
  if (!resolved.ok) {
    rec.paused = true;
    rec.pauseReason = resolved.reason;
    rec.ownerEmail = "";
    return rec;
  }
  rec.ownerEmail = resolved.user.email;
  rec.owner = resolved.user.name || rec.owner;
  if (resolved.source === "roster") {
    rec.paused = true;
    rec.pauseReason = "Assigned rep has no active Yard login. CTE emails paused — Paid Next Steps still send.";
    return rec;
  }
  if (rec.pauseReason.startsWith("Assigned") || rec.pauseReason.startsWith("No assigned")) {
    rec.paused = false;
    rec.pauseReason = "";
  }
  return rec;
}

export async function startWorking(
  env: CycleEnv,
  hint: ContactHint,
  actor: string,
  now = new Date(),
): Promise<CycleRecord> {
  const rec = await loadOrCreate(env, hint);
  const users = await readUsers(env);
  applyRepGate(rec, users);
  rec.lifecycle = rec.lifecycle && rec.lifecycle !== "New" ? rec.lifecycle : "Working";
  rec.cteStage = rec.cteStage || "CTE1";
  rec.cte1Date = rec.cte1Date || civilKey(chicagoNow(now).civil);
  rec.nextDue = rec.nextDue || `${rec.cte1Date}T10:00`;
  pushEvent(rec, "CTE1 opened · human call/text day. No autonomous call.", actor);
  await writeRecord(env, rec);
  return rec;
}

export async function logAttempt(
  env: CycleEnv,
  hint: ContactHint,
  outcome: "logged" | "no_answer",
  actor: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ rec: CycleRecord; send?: unknown }> {
  const rec = await startWorking(env, hint, actor);
  if (outcome === "logged") {
    pushEvent(rec, "CTE attempt logged.", actor);
    await writeRecord(env, rec);
    return { rec };
  }
  pushEvent(rec, "CTE1 = No answer. Intro email queued.", actor);
  applyNoAnswerSchedule(rec, holidayExtras(env));
  rec.sends.cte1 = rec.sends.cte1 && rec.sends.cte1.status === "sent"
    ? rec.sends.cte1
    : { template: "cte1", status: "pending", dueAt: new Date().toISOString(), attempts: 0 };
  await writeRecord(env, rec);
  const send = await fireTemplate(env, rec, "cte1", actor, fetchImpl);
  return { rec, send };
}

export async function stopForReply(
  env: CycleEnv,
  hint: ContactHint,
  actor: string,
  source: "rep" | "agentmail",
  fetchImpl: typeof fetch = fetch,
): Promise<CycleRecord> {
  const rec = await loadOrCreate(env, hint);
  const users = await readUsers(env);
  applyRepGate(rec, users);
  if (!rec.stopped) {
    rec.stopped = true;
    rec.stoppedReason = source === "rep" ? "Rep clicked Replied" : "Inbound AgentMail reply";
    rec.nextDue = "";
    skipRemainingCte(rec, actor, "after reply-stop");
    rec.cteStage = "parked";
    pushEvent(rec, "Client replied · Ladder stopped", actor);
    if (source === "agentmail" && rec.ownerEmail) {
      await pushAlert(env, rec.ownerEmail, rec.contactId, `${rec.clientName || "Client"} replied. Ladder stopped.`);
      if (agentMailReady(env)) {
        await sendAgentMail(
          env,
          {
            to: [rec.ownerEmail],
            subject: `Client replied — ${rec.clientName || rec.contactId}`,
            text: `${rec.clientName || "A client"} replied. The CTE ladder is stopped. Open The Yard and pick it up.\n\nCB Shipping Solutions`,
            labels: ["yard-rep-alert"],
          },
          fetchImpl,
        );
      }
    }
  }
  await writeRecord(env, rec);
  return rec;
}

export async function overrideCte(
  env: CycleEnv,
  hint: ContactHint,
  whenLocal: string,
  reason: string,
  actor: string,
): Promise<{ ok: boolean; rec: CycleRecord; error?: string }> {
  const rec = await loadOrCreate(env, hint);
  const users = await readUsers(env);
  applyRepGate(rec, users);
  if (rec.stopped) return { ok: false, rec, error: "Reply-stop already won. Override cannot restart the ladder." };
  applyNoAnswerSchedule(rec, holidayExtras(env));
  const result = applyOverride(rec, whenLocal, holidayExtras(env));
  if (!result.ok) return { ok: false, rec, error: result.error };
  rec.overrideAt = new Date().toISOString();
  rec.overrideBy = actor;
  rec.overrideReason = String(reason || "").trim();
  rec.overrideFrom = result.from;
  rec.overrideTo = result.to;
  pushEvent(
    rec,
    `Override CTE ${result.step}: ${result.from || "unset"} → ${result.to}${rec.overrideReason ? " · " + rec.overrideReason : ""}.`,
    actor,
  );
  await writeRecord(env, rec);
  return { ok: true, rec };
}

function skipRemainingCte(rec: CycleRecord, actor: string, why: string): void {
  for (const id of CTE_TEMPLATE_IDS) {
    const send = rec.sends[id];
    if (send && send.status !== "sent") {
      rec.sends[id] = { ...send, status: "skipped" };
      pushEvent(rec, `Skipped duplicate / remaining ${id} ${why}.`, actor);
    }
  }
}

export async function markBadNumber(
  env: CycleEnv,
  hint: ContactHint,
  actor: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ rec: CycleRecord; send?: unknown; legacyStatus: string }> {
  const rec = await loadOrCreate(env, hint);
  const users = await readUsers(env);
  applyRepGate(rec, users, { allowRoster: true });
  if (isExit(rec.lifecycle) || rec.lifecycle === "Paid" || rec.lifecycle === "Delivered") {
    pushEvent(rec, "Bad number ignored — this contact is already closed.", actor);
    await writeRecord(env, rec);
    return { rec, send: { ok: false, error: "This contact is already closed." }, legacyStatus: legacyStatusFor(rec.lifecycle as Lifecycle) };
  }
  if (!rec.lifecycle || rec.lifecycle === "New") rec.lifecycle = "Working";
  skipRemainingCte(rec, actor, "after bad number");
  rec.stopped = true;
  rec.stoppedReason = "Bad number";
  rec.cteStage = "parked";
  rec.nextDue = "";
  pushEvent(rec, "Bad number. CTE calls parked. Email campaign asking for a working number.", actor);
  if (rec.sends.bad_number?.status === "sent") {
    pushEvent(rec, "Skipped duplicate bad-number email.", actor);
    await writeRecord(env, rec);
    return { rec, send: { ok: true, duplicate: true }, legacyStatus: "Email campaign" };
  }
  rec.sends.bad_number = rec.sends.bad_number && rec.sends.bad_number.status === "pending"
    ? rec.sends.bad_number
    : { template: "bad_number", status: "pending", dueAt: new Date().toISOString(), attempts: 0 };
  const send = await fireTemplate(env, rec, "bad_number", actor, fetchImpl);
  return { rec, send, legacyStatus: "Email campaign" };
}

export async function setLifecycle(
  env: CycleEnv,
  hint: ContactHint,
  life: Lifecycle,
  actor: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ rec: CycleRecord; legacyStatus: string; sent?: boolean; error?: string }> {
  const rec = await loadOrCreate(env, hint);
  const users = await readUsers(env);
  applyRepGate(rec, users);
  rec.lifecycle = life;
  pushEvent(rec, `Lifecycle → ${life}.`, actor);
  if (isExit(life)) {
    rec.stopped = true;
    rec.stoppedReason = life;
    rec.cteStage = "parked";
    rec.nextDue = "";
    pushEvent(rec, `Exit ${life}. Ladder parked.`, actor);
    const template = life === "Bought elsewhere" ? "bought_elsewhere" : life === "Not interested" ? "not_interested" : "lost";
    if (!reengageOn(env)) {
      pushEvent(rec, `${template} template ready; sending disabled until Christopher approves copy (REENGAGE_EMAILS_ENABLED).`, actor);
    } else if (rec.sends[template]?.status !== "sent") {
      rec.sends[template] = { template, status: "pending", dueAt: new Date().toISOString(), attempts: 0 };
      await fireTemplate(env, rec, template, actor, fetchImpl);
    }
  }
  if (life === "Paid") {
    rec.stopped = true;
    rec.cteStage = "parked";
    rec.nextDue = "";
  }
  await writeRecord(env, rec);
  return { rec, legacyStatus: legacyStatusFor(life) };
}

export async function markContactPaid(
  env: CycleEnv,
  hint: ContactHint,
  actor: string,
  fetchImpl: typeof fetch = fetch,
  opts: { skipEmail?: boolean } = {},
): Promise<{ rec: CycleRecord; send?: unknown }> {
  const rec = await loadOrCreate(env, hint);
  const users = await readUsers(env);
  applyRepGate(rec, users, { allowRoster: true });
  rec.lifecycle = "Paid";
  rec.stopped = true;
  rec.cteStage = "parked";
  rec.nextDue = "";
  pushEvent(rec, "Marked paid. Next Steps email once-only.", actor);
  if (opts.skipEmail) {
    pushEvent(rec, "Paid recorded. Next Steps email owned by the invoice Worker (no second send).", actor);
    await writeRecord(env, rec);
    return { rec, send: { ok: true, skipped: true } };
  }
  if (rec.sends.paid?.status === "sent") {
    pushEvent(rec, "Skipped duplicate paid / Next Steps email.", actor);
    await writeRecord(env, rec);
    return { rec, send: { ok: true, duplicate: true } };
  }
  rec.sends.paid = { template: "paid", status: "pending", dueAt: new Date().toISOString(), attempts: 0 };
  const send = await fireTemplate(env, rec, "paid", actor, fetchImpl);
  return { rec, send };
}

export async function reassignOwner(
  env: CycleEnv,
  hint: ContactHint,
  actor: string,
): Promise<CycleRecord> {
  const rec = await loadOrCreate(env, hint);
  const previous = rec.ownerEmail;
  rec.owner = String(hint.owner || rec.owner || "");
  const users = await readUsers(env);
  applyRepGate(rec, users);
  pushEvent(rec, `Reassigned owner → ${rec.owner || "unset"} (${rec.ownerEmail || "no email"}). History kept.`, actor);
  if (previous && rec.ownerEmail && previous !== rec.ownerEmail) {
    pushEvent(rec, "Future touches and alerts go to the new rep. Prior owner is not notified.", actor);
  }
  await writeRecord(env, rec);
  return rec;
}

export async function fireTemplate(
  env: CycleEnv,
  rec: CycleRecord,
  id: TemplateId,
  actor: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SendMailResultLike> {
  if (rec.stopped && !SEND_WHEN_STOPPED.includes(id)) {
    pushEvent(rec, `Skipped ${id} — ladder stopped.`, actor);
    await writeRecord(env, rec);
    return { ok: false, skipped: true, error: "Ladder stopped." };
  }
  const existing = rec.sends[id];
  if (existing?.status === "sent") {
    pushEvent(rec, `Skipped duplicate ${id}.`, actor);
    await writeRecord(env, rec);
    return { ok: true, duplicate: true, messageId: existing.messageId };
  }
  if (!rec.clientEmail) {
    rec.paused = true;
    rec.pauseReason = id === "paid"
      ? "No client email. Pause — do not send Next Steps."
      : "No client email. Pause — do not send.";
    if (id === "paid") {
      rec.sends.paid = {
        template: "paid",
        status: "failed",
        dueAt: existing?.dueAt,
        failedAt: new Date().toISOString(),
        error: rec.pauseReason,
        attempts: (existing?.attempts || 0) + 1,
      };
    }
    pushEvent(rec, rec.pauseReason, actor);
    await writeRecord(env, rec);
    return { ok: false, error: rec.pauseReason };
  }
  const users = await readUsers(env);
  applyRepGate(rec, users, id === "paid" || id === "bad_number" ? { allowRoster: true } : {});
  if (id === "paid" && rec.ownerEmail && rec.pauseReason.startsWith("Assigned rep has no active Yard login")) {
    pushEvent(rec, "Paid Next Steps CC/reply-to uses roster email — assigned rep has no active Yard login.", actor);
  } else if (id === "paid" && !rec.ownerEmail) {
    pushEvent(rec, "Paid Next Steps sending without assigned-rep CC/reply-to (no active login or known roster email).", actor);
  }
  if (id !== "paid" && id !== "bad_number" && rec.paused && !rec.ownerEmail) {
    pushEvent(rec, rec.pauseReason || "Paused — missing assigned rep email.", actor);
    await writeRecord(env, rec);
    return { ok: false, error: rec.pauseReason || "Paused." };
  }
  rec.sends[id] = {
    template: id,
    status: "sending",
    dueAt: existing?.dueAt,
    idempotencyKey: `${rec.contactId}:${id}`,
    attempts: (existing?.attempts || 0) + 1,
  };
  await writeRecord(env, rec);
  const mail = renderTemplate(id, {
    clientFirstName: firstNameOf(rec.clientName),
    clientName: rec.clientName,
    repName: rec.owner,
    repEmail: rec.ownerEmail,
    repPhone: rosterPhone(rec.owner),
    repTitle: rosterTitle(rec.owner),
  });
  const cc = id === "paid"
    ? [...officeCopy(), rec.ownerEmail].filter(Boolean)
    : id === "bad_number"
      ? [rec.ownerEmail].filter(Boolean)
      : [];
  const pdf = id === "paid" ? await loadNextStepsPdf(env) : null;
  const attachments = pdf ? [pdf] : undefined;
  const result = await sendAgentMail(
    env,
    {
      to: [rec.clientEmail],
      cc: [...new Set(cc)],
      replyTo: rec.ownerEmail ? [rec.ownerEmail] : undefined,
      subject: mail.subject,
      text: mail.text,
      labels: ["yard-cycle", id],
      attachments,
    },
    fetchImpl,
  );
  if (result.ok) {
    rec.sends[id] = {
      template: id,
      status: "sent",
      dueAt: existing?.dueAt,
      sentAt: new Date().toISOString(),
      messageId: result.messageId,
      threadId: result.threadId,
      idempotencyKey: `${rec.contactId}:${id}`,
      attempts: (existing?.attempts || 0) + 1,
    };
    if (result.threadId && !rec.threadIds.includes(result.threadId)) rec.threadIds.push(result.threadId);
    if (result.messageId && !rec.messageIds.includes(result.messageId)) rec.messageIds.push(result.messageId);
    rec.cteStage = CTE_STAGE[id] || rec.cteStage;
    if (id === "cte4" || id === "paid") {
      rec.cteStage = "parked";
      rec.nextDue = "";
      if (id === "cte4") pushEvent(rec, "CTE4 sent. Ladder parked.", actor);
      if (id === "paid" && !attachments) {
        pushEvent(rec, "Paid email sent without PDF. Add cbss-invoice/assets/CBSS-Next-Steps-After-Your-Order.pdf (URL attach is not used).", actor);
      }
    } else {
      rec.nextDue = nextOpenDue(rec);
    }
    rec.paused = false;
    rec.pauseReason = "";
    pushEvent(rec, `Sent ${id} via AgentMail (${result.messageId}).`, actor);
    await writeRecord(env, rec);
    return { ok: true, messageId: result.messageId, threadId: result.threadId };
  }
  rec.sends[id] = {
    template: id,
    status: "failed",
    dueAt: existing?.dueAt,
    failedAt: new Date().toISOString(),
    error: result.error,
    attempts: (existing?.attempts || 0) + 1,
  };
  pushEvent(rec, `Send failed ${id}: ${result.error}`, actor);
  await writeRecord(env, rec);
  return { ok: false, error: result.error, transient: result.transient };
}

type SendMailResultLike = {
  ok: boolean;
  error?: string;
  skipped?: boolean;
  duplicate?: boolean;
  messageId?: string;
  threadId?: string;
  transient?: boolean;
};

function asHint(rec: CycleRecord): ContactHint {
  return { id: rec.contactId, name: rec.clientName, email: rec.clientEmail, owner: rec.owner, lifecycle: rec.lifecycle };
}

export async function runDueSends(env: CycleEnv, now = new Date(), fetchImpl: typeof fetch = fetch): Promise<{ scanned: number; sent: number }> {
  if (!chicagoBusinessHours(now)) return { scanned: 0, sent: 0 };
  const ids = await readIndex(env);
  let sent = 0;
  for (const id of ids) {
    const rec = await readRecord(env, id);
    if (!rec) continue;
    for (const template of dueTemplates(rec, now)) {
      const result = await fireTemplate(env, rec, template, "cron", fetchImpl);
      if (result.ok && !result.duplicate) sent += 1;
    }
  }
  return { scanned: ids.length, sent };
}

export async function pollReplies(env: CycleEnv, fetchImpl: typeof fetch = fetch): Promise<number> {
  if (!agentMailReady(env)) return 0;
  const listed = await listInboxMessages(env, { limit: 40, labels: ["received"] }, fetchImpl);
  if (!listed.ok) return 0;
  let n = 0;
  for (const msg of listed.messages) {
    if (!msg.threadId || !msg.messageId) continue;
    const matches = await recordsByThread(env, msg.threadId);
    for (const rec of matches) {
      if (rec.messageIds.includes(msg.messageId)) continue;
      if (rec.stopped) continue;
      rec.messageIds.push(msg.messageId);
      await stopForReply(env, asHint(rec), "agentmail", "agentmail", fetchImpl);
      n += 1;
    }
  }
  return n;
}

export async function ingestInbound(
  env: CycleEnv,
  payload: { threadId?: string; messageId?: string; from?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const threadId = String(payload.threadId || "").trim();
  const messageId = String(payload.messageId || "").trim();
  if (!threadId) return 0;
  const matches = await recordsByThread(env, threadId);
  let n = 0;
  for (const rec of matches) {
    if (messageId && rec.messageIds.includes(messageId)) continue;
    if (messageId) rec.messageIds.push(messageId);
    await stopForReply(env, asHint(rec), "agentmail", "agentmail", fetchImpl);
    n += 1;
  }
  return n;
}

export async function getCycle(env: CycleEnv, hint: ContactHint): Promise<CycleRecord> {
  const rec = await loadOrCreate(env, hint);
  applyRepGate(rec, await readUsers(env));
  return rec;
}
