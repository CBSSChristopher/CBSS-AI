import { DEFAULT_INBOX } from "../cycle/agentmail.ts";
import { runCteWork, type CycleEnv } from "../cycle/engine.ts";
import { HARBOR_REPLY_TO } from "../cycle/rep.ts";
import type { TemplateId } from "../cycle/templates.ts";
import { HARBOR_OWNER, normalizeCteStep, normalizeHarborOutcome } from "./workflow.ts";

/** Outcomes that enroll the current CTE step on the same AgentMail path a Yard rep uses. */
const HARBOR_CTE_SEND_OUTCOMES = new Set(["no-answer", "voicemail", "soft-delay", "callback"]);

export type HarborCteMailResult = {
  required: boolean;
  ok: boolean;
  dialing: false;
  sms: false;
  step: TemplateId | "";
  to: string;
  from: string;
  replyTo: string;
  messageId?: string;
  threadId?: string;
  duplicate?: boolean;
  error?: string;
};

function inboxFrom(env: { AGENTMAIL_INBOX?: string }): string {
  return String(env.AGENTMAIL_INBOX || DEFAULT_INBOX).trim() || DEFAULT_INBOX;
}

/** CTE step the rep just worked. Voicemail/no-answer advance the card after this send. */
export function harborCteTemplateFor(contact: Record<string, unknown>, rawOutcome: unknown): TemplateId | "" {
  const outcome = normalizeHarborOutcome(rawOutcome);
  if (!outcome || !HARBOR_CTE_SEND_OUTCOMES.has(outcome)) return "";
  const step = normalizeCteStep(contact.cteStage || "CTE1").toLowerCase();
  if (step === "cte1" || step === "cte2" || step === "cte3" || step === "cte4") return step;
  return "";
}

/**
 * Live CTE send for a Harbor outcome. Calls runCteWork → fireTemplate → sendAgentMail.
 * No stub success: a missing AgentMail key or client email comes back ok:false.
 */
export async function dispatchHarborCteMail(
  env: CycleEnv,
  contact: Record<string, unknown>,
  rawOutcome: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<HarborCteMailResult> {
  const from = inboxFrom(env);
  const step = harborCteTemplateFor(contact, rawOutcome);
  const to = String(contact.email || contact.clientEmail || "").trim().toLowerCase();
  if (!step) {
    return { required: false, ok: true, dialing: false, sms: false, step: "", to, from, replyTo: HARBOR_REPLY_TO };
  }
  const hint = {
    id: String(contact.id || "").trim(),
    name: String(contact.name || "").trim(),
    email: to,
    owner: HARBOR_OWNER,
  };
  const result = await runCteWork(env, hint, { step, outcome: "no_answer" }, HARBOR_OWNER, fetchImpl);
  const send = result.send && typeof result.send === "object" ? result.send as {
    ok?: boolean;
    error?: string;
    messageId?: string;
    threadId?: string;
    duplicate?: boolean;
  } : { ok: false, error: "CTE send did not run." };
  return {
    required: true,
    ok: send.ok === true,
    dialing: false,
    sms: false,
    step,
    to,
    from,
    replyTo: result.rec.ownerEmail || HARBOR_REPLY_TO,
    messageId: send.messageId,
    threadId: send.threadId,
    duplicate: send.duplicate,
    error: send.ok ? undefined : (send.error || "AgentMail send failed."),
  };
}
