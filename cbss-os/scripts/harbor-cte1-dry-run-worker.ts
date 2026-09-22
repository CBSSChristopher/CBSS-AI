/**
 * On-Worker desk dry-run. Not The Yard entrypoint — do not deploy this file as cbssos main.
 *
 *   npx wrangler dev scripts/harbor-cte1-dry-run-worker.ts --name cbssos --remote --port 8791
 *
 * Remote mode is what can see the Worker secret AGENTMAIL_API_KEY. Running this
 * from cbss-os still loads wrangler.jsonc, including production SESSIONS. Delete
 * cycle:rec:sandbox-harbor-cte1 and drop that id from cycle:index afterward so
 * cron does not send CTE2–CTE4. Sends one CTE1 to the company tracking mailbox only.
 */
import { DEFAULT_INBOX, ownerTrackingCc } from "../src/cycle/agentmail.ts";
import { dispatchHarborCteMail } from "../src/va/harbor-mail.ts";
import { harborAssignPatch, normalizeCteStep, pickHarborQueue } from "../src/va/workflow.ts";

const SAFE_TO = ownerTrackingCc();

export default {
  async fetch(_request: Request, env: { AGENTMAIL_API_KEY?: string; AGENTMAIL_INBOX?: string }): Promise<Response> {
    const lead = {
      id: "sandbox-harbor-cte1",
      name: "Sandbox Harbor CTE",
      phone: "8705550142",
      email: SAFE_TO,
      owner: "New/Unassigned",
      status: "New",
    };
    const queued = pickHarborQueue([lead]);
    if (!queued) {
      return Response.json({ ok: false, error: "Sandbox lead was not claimable.", dialing: false, sms: false });
    }
    const cte = queued.source === "follow-up" ? normalizeCteStep(queued.contact.cteStage) : "CTE1";
    const claimed = { ...queued.contact, ...harborAssignPatch(cte, queued.source), id: lead.id, email: SAFE_TO };
    const mailed = await dispatchHarborCteMail(
      { ...env, AGENTMAIL_INBOX: env.AGENTMAIL_INBOX || DEFAULT_INBOX },
      claimed,
      "no-answer",
    );
    return Response.json({
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
    });
  },
};
