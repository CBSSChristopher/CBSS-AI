/**
 * Desk dry-run: Harbor claims a sandbox lead (dial off) and logs CTE1 no-answer.
 * Uses the real sendAgentMail path. No stub. Missing AGENTMAIL_API_KEY fails closed.
 *
 * Safe recipient: the sandbox lead's email is ownerTrackingCc() (already CC'd
 * on every AgentMail send). Override with HARBOR_CTE_DRY_RUN_TO.
 * This script does not read the live CRM.
 */
import { DEFAULT_INBOX, ownerTrackingCc } from "../src/cycle/agentmail.ts";
import { dispatchHarborCteMail } from "../src/va/harbor-mail.ts";
import { harborAssignPatch, normalizeCteStep, pickHarborQueue } from "../src/va/workflow.ts";

function memoryKv() {
  const data = new Map();
  return {
    async get(key, type) {
      const value = data.get(key);
      if (value == null) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      data.set(key, String(value));
    },
    async delete(key) {
      data.delete(key);
    },
  };
}

const to = String(process.env.HARBOR_CTE_DRY_RUN_TO || ownerTrackingCc()).trim().toLowerCase();
const lead = {
  id: "sandbox-harbor-cte1",
  name: "Sandbox Harbor CTE",
  phone: "8705550142",
  email: to,
  owner: "New/Unassigned",
  status: "New",
};

const queued = pickHarborQueue([lead]);
if (!queued) {
  console.log(JSON.stringify({ ok: false, error: "Sandbox lead was not claimable.", dialing: false, sms: false }));
  process.exit(1);
}
const cte = queued.source === "follow-up" ? normalizeCteStep(queued.contact.cteStage) : "CTE1";
const patch = harborAssignPatch(cte, queued.source);
const claimed = { ...queued.contact, ...patch, id: lead.id, email: to };

const env = {
  SESSIONS: memoryKv(),
  AGENTMAIL_API_KEY: String(process.env.AGENTMAIL_API_KEY || ""),
  AGENTMAIL_INBOX: String(process.env.AGENTMAIL_INBOX || DEFAULT_INBOX),
};

const mailed = await dispatchHarborCteMail(env, claimed, "no-answer");
const report = {
  ok: mailed.ok === true,
  leadId: claimed.id,
  leadName: claimed.name,
  source: queued.source,
  cteStage: cte,
  outcome: "no-answer",
  to: mailed.to,
  from: mailed.from,
  replyTo: mailed.replyTo,
  messageId: mailed.messageId || "",
  error: mailed.error || "",
  duplicate: Boolean(mailed.duplicate),
  dialing: false,
  sms: false,
  agentMailConfigured: Boolean(String(env.AGENTMAIL_API_KEY || "").trim()),
  step: mailed.step,
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
