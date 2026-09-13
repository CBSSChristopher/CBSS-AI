import { verifyAgentMailWebhook } from "./agentmail.ts";
import {
  applyBookStage,
  CALL_OUTCOMES,
  getCycle,
  ingestInbound,
  logAttempt,
  logTouch,
  markBadNumber,
  markContactPaid,
  overrideCte,
  pollReplies,
  publicCycle,
  reassignOwner,
  runCteWork,
  runDueSends,
  setLifecycle,
  startWorking,
  stopForReply,
  TEXT_OUTCOMES,
  type ContactHint,
  type CycleEnv,
  type TouchChannel,
} from "./engine.ts";
import { EXITS, LIFECYCLES, normalizeLifecycle, type Lifecycle } from "./lifecycle.ts";
import { STAGES, normalizeStage } from "../stages.ts";
import { readAlerts } from "./store.ts";
import { addCampaign } from "../campaign.ts";

function hintFrom(body: Record<string, unknown>, fallbackId = ""): ContactHint {
  return {
    id: String(body.id || body.contactId || fallbackId || "").trim(),
    name: String(body.name || body.clientName || "").trim(),
    email: String(body.email || body.clientEmail || "").trim(),
    owner: String(body.owner || "").trim(),
    status: String(body.status || "").trim(),
    lifecycle: String(body.lifecycle || "").trim(),
  };
}

export async function handleCycleAuthed(
  path: string,
  method: string,
  env: CycleEnv,
  user: { email: string; name: string },
  body: Record<string, unknown>,
  query: URLSearchParams,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const actor = user.name || user.email;
  if (method === "GET" && path === "/cycle/alerts") {
    return { status: 200, body: { ok: true, alerts: await readAlerts(env, user.email) } };
  }
  if ((method === "GET" || method === "POST") && path === "/cycle/contact") {
    const hint = hintFrom(body, query.get("id") || "");
    if (!hint.id) return { status: 400, body: { error: "Missing contact id." } };
    const rec = await getCycle(env, hint);
    return {
      status: 200,
      body: {
        ok: true,
        cycle: publicCycle(rec),
        stages: [...STAGES],
        lifecycles: [...LIFECYCLES, ...EXITS],
        callOutcomes: [...CALL_OUTCOMES],
        textOutcomes: [...TEXT_OUTCOMES],
      },
    };
  }
  const hint = hintFrom(body);
  if (!hint.id && path !== "/cycle/paid") return { status: 400, body: { error: "Missing contact id." } };

  if (method === "POST" && path === "/cycle/work") {
    const result = await runCteWork(env, hint, {
      step: String(body.step || body.cte || ""),
      outcome: String(body.outcome || ""),
    }, actor);
    if (result.error) return { status: 200, body: { ok: false, error: result.error, cycle: publicCycle(result.rec) } };
    let items: unknown[] | undefined;
    if (result.campaign) {
      items = await addCampaign(env, {
        id: hint.id,
        name: hint.name || result.rec.clientName,
        email: hint.email || result.rec.clientEmail,
        phone: String(body.phone || ""),
        city: String(body.city || ""),
        owner: hint.owner || result.rec.owner,
        addedBy: actor,
        addedAt: new Date().toISOString(),
        reason: result.campaign === "bad_number" ? "bad_number" : "hold",
      });
    }
    const sendRec = result.send && typeof result.send === "object" ? result.send as { ok?: boolean; error?: string } : {};
    const ok = sendRec.ok !== false;
    return {
      status: 200,
      body: {
        ok,
        cycle: publicCycle(result.rec),
        send: result.send,
        bookStatus: result.bookStatus,
        legacyStatus: result.bookStatus,
        items,
        ...(ok ? {} : { error: sendRec.error || "AgentMail did not send." }),
      },
    };
  }
  if (method === "POST" && path === "/cycle/attempt") {
    const outcome = String(body.outcome || "").trim() === "no_answer" ? "no_answer" : "logged";
    const { rec, send } = await logAttempt(env, hint, outcome, actor);
    return { status: 200, body: { ok: true, cycle: publicCycle(rec), send } };
  }
  if (method === "POST" && path === "/cycle/replied") {
    const rec = await stopForReply(env, hint, actor, "rep");
    return { status: 200, body: { ok: true, cycle: publicCycle(rec) } };
  }
  if (method === "POST" && path === "/cycle/bad-number") {
    const { rec, send, legacyStatus } = await markBadNumber(env, hint, actor);
    const sendRec = send && typeof send === "object" ? send as { ok?: boolean; error?: string } : {};
    const closed = sendRec.error === "This contact is already closed.";
    const items = closed
      ? []
      : await addCampaign(env, {
        id: hint.id,
        name: hint.name || rec.clientName,
        email: hint.email || rec.clientEmail,
        phone: String(body.phone || ""),
        city: String(body.city || ""),
        owner: hint.owner || rec.owner,
        addedBy: actor,
        addedAt: new Date().toISOString(),
        reason: "bad_number",
      });
    const ok = sendRec.ok !== false;
    return {
      status: 200,
      body: {
        ok,
        cycle: publicCycle(rec),
        send,
        items,
        legacyStatus,
        ...(ok ? {} : { error: sendRec.error || "Bad-number email did not send." }),
      },
    };
  }
  if (method === "POST" && path === "/cycle/override") {
    const result = await overrideCte(env, hint, String(body.when || body.followUpDate || ""), String(body.reason || ""), actor);
    if (!result.ok) return { status: 200, body: { ok: false, error: result.error, cycle: publicCycle(result.rec) } };
    return { status: 200, body: { ok: true, cycle: publicCycle(result.rec) } };
  }
  if (method === "POST" && path === "/cycle/lifecycle") {
    const life = normalizeLifecycle(body.lifecycle || body.status);
    if (!life) return { status: 400, body: { error: "Pick a stage." } };
    const result = await setLifecycle(env, hint, life as Lifecycle, actor);
    return { status: 200, body: { ok: true, cycle: publicCycle(result.rec), legacyStatus: result.legacyStatus } };
  }
  if (method === "POST" && path === "/cycle/stage") {
    const stage = normalizeStage(body.stage || body.status || body.lifecycle);
    if (!stage) return { status: 400, body: { error: "Pick a stage." } };
    const result = await applyBookStage(env, hint, stage, actor);
    return { status: 200, body: { ok: true, cycle: publicCycle(result.rec), bookStatus: result.bookStatus, legacyStatus: result.bookStatus } };
  }
  if (method === "POST" && path === "/cycle/touch") {
    const channel = String(body.channel || "").trim().toLowerCase() === "text" ? "text" : String(body.channel || "").trim().toLowerCase() === "call" ? "call" : "";
    if (!channel) return { status: 400, body: { error: "Say whether this was a call or a text." } };
    const result = await logTouch(env, hint, {
      channel: channel as TouchChannel,
      outcome: String(body.outcome || ""),
      note: String(body.note || ""),
    }, actor);
    if (result.error) return { status: 200, body: { ok: false, error: result.error, cycle: publicCycle(result.rec) } };
    return { status: 200, body: { ok: true, cycle: publicCycle(result.rec) } };
  }
  if (method === "POST" && path === "/cycle/paid") {
    if (!hint.id && !hint.email) return { status: 400, body: { error: "Missing contact id or email." } };
    if (!hint.id) hint.id = `email:${hint.email}`;
    const skipEmail = body.skipEmail === true || body.skip_email === true;
    const { rec, send } = await markContactPaid(env, hint, actor, fetch, { skipEmail });
    const sendRec = send && typeof send === "object" ? send as { ok?: boolean; error?: string } : {};
    const ok = sendRec.ok !== false;
    return { status: 200, body: { ok, cycle: publicCycle(rec), send, ...(ok ? {} : { error: sendRec.error || "Next Steps email did not send." }) } };
  }
  if (method === "POST" && path === "/cycle/reassign") {
    const rec = await reassignOwner(env, hint, actor);
    return { status: 200, body: { ok: true, cycle: publicCycle(rec) } };
  }
  if (method === "POST" && path === "/cycle/start") {
    const rec = await startWorking(env, hint, actor);
    return { status: 200, body: { ok: true, cycle: publicCycle(rec) } };
  }
  return { status: 404, body: { error: "Not found." } };
}

export async function handleAgentMailHook(env: CycleEnv & { AGENTMAIL_WEBHOOK_SECRET?: string }, request: Request): Promise<{ status: number; body: Record<string, unknown> }> {
  const raw = await request.text();
  const secret = String(env.AGENTMAIL_WEBHOOK_SECRET || "").trim();
  if (secret) {
    const ok = await verifyAgentMailWebhook(secret, request.headers, raw);
    if (!ok) return { status: 400, body: { error: "Bad webhook signature." } };
  } else {
    return { status: 401, body: { error: "AGENTMAIL_WEBHOOK_SECRET is not set. Cron poll still runs." } };
  }
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    return { status: 400, body: { error: "Bad JSON." } };
  }
  const eventType = String(payload.event_type || payload.eventType || "").toLowerCase();
  const message = payload.message && typeof payload.message === "object"
    ? (payload.message as Record<string, unknown>)
    : payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;
  if (eventType && eventType !== "message.received") return { status: 204, body: { ok: true, ignored: eventType } };
  const labels = Array.isArray(message.labels) ? message.labels.map(String) : [];
  if (labels.includes("sent") && !labels.includes("received")) {
    return { status: 204, body: { ok: true, ignored: "outbound" } };
  }
  const n = await ingestInbound(env, {
    threadId: String(message.thread_id || message.threadId || payload.thread_id || ""),
    messageId: String(message.message_id || message.messageId || payload.message_id || ""),
    from: String(message.from || payload.from || ""),
    subject: String(message.subject || payload.subject || ""),
    text: String(message.text || message.preview || payload.text || ""),
    preview: String(message.preview || message.text || ""),
  });
  return { status: 200, body: { ok: true, stopped: n } };
}

export async function runCycleCron(env: CycleEnv): Promise<{ due: { scanned: number; sent: number }; replies: number }> {
  const due = await runDueSends(env);
  const replies = await pollReplies(env);
  return { due, replies };
}
