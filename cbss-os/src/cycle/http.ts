import { verifyAgentMailWebhook } from "./agentmail.ts";
import {
  getCycle,
  ingestInbound,
  logAttempt,
  markContactPaid,
  overrideCte,
  pollReplies,
  publicCycle,
  reassignOwner,
  runDueSends,
  setLifecycle,
  startWorking,
  stopForReply,
  type ContactHint,
  type CycleEnv,
} from "./engine.ts";
import { crmPatchForLifecycle, EXITS, LIFECYCLES, normalizeLifecycle, type Lifecycle } from "./lifecycle.ts";
import { readAlerts } from "./store.ts";

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
    return { status: 200, body: { ok: true, cycle: publicCycle(rec), lifecycles: [...LIFECYCLES, ...EXITS] } };
  }
  const hint = hintFrom(body);
  if (!hint.id && path !== "/cycle/paid") return { status: 400, body: { error: "Missing contact id." } };

  if (method === "POST" && path === "/cycle/attempt") {
    const outcome = String(body.outcome || "").trim() === "no_answer" ? "no_answer" : "logged";
    const { rec, send } = await logAttempt(env, hint, outcome, actor);
    return { status: 200, body: { ok: true, cycle: publicCycle(rec), send } };
  }
  if (method === "POST" && path === "/cycle/replied") {
    const rec = await stopForReply(env, hint, actor, "rep");
    return { status: 200, body: { ok: true, cycle: publicCycle(rec) } };
  }
  if (method === "POST" && path === "/cycle/override") {
    const result = await overrideCte(env, hint, String(body.when || body.followUpDate || ""), String(body.reason || ""), actor);
    if (!result.ok) return { status: 200, body: { ok: false, error: result.error, cycle: publicCycle(result.rec) } };
    return { status: 200, body: { ok: true, cycle: publicCycle(result.rec) } };
  }
  if (method === "POST" && path === "/cycle/lifecycle") {
    const life = normalizeLifecycle(body.lifecycle || body.status);
    if (!life) return { status: 400, body: { error: "Pick a lifecycle status." } };
    if (life === "Paid") {
      const { rec, send, crmPatch } = await markContactPaid(env, hint, actor);
      const sendRec = send && typeof send === "object" ? send as { ok?: boolean; error?: string } : {};
      const ok = sendRec.ok !== false;
      return {
        status: 200,
        body: {
          ok,
          cycle: publicCycle(rec),
          send,
          crmPatch,
          legacyStatus: crmPatch.status,
          ...(ok ? {} : { error: sendRec.error || "Next Steps email did not send." }),
        },
      };
    }
    const result = await setLifecycle(env, hint, life as Lifecycle, actor);
    const crmPatch = result.crmPatch || crmPatchForLifecycle(life as Lifecycle);
    return { status: 200, body: { ok: true, cycle: publicCycle(result.rec), legacyStatus: crmPatch.status, crmPatch } };
  }
  if (method === "POST" && path === "/cycle/paid") {
    if (!hint.id && !hint.email) return { status: 400, body: { error: "Missing contact id or email." } };
    if (!hint.id) hint.id = `email:${hint.email}`;
    const skipEmail = body.skipEmail === true || body.skip_email === true;
    const { rec, send, crmPatch } = await markContactPaid(env, hint, actor, fetch, { skipEmail });
    const sendRec = send && typeof send === "object" ? send as { ok?: boolean; error?: string } : {};
    const ok = sendRec.ok !== false;
    return {
      status: 200,
      body: {
        ok,
        cycle: publicCycle(rec),
        send,
        crmPatch,
        legacyStatus: crmPatch.status,
        ...(ok ? {} : { error: sendRec.error || "Next Steps email did not send." }),
      },
    };
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
  });
  return { status: 200, body: { ok: true, stopped: n } };
}

export async function runCycleCron(env: CycleEnv): Promise<{ due: { scanned: number; sent: number }; replies: number }> {
  const due = await runDueSends(env);
  const replies = await pollReplies(env);
  return { due, replies };
}
