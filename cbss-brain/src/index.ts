import {
  checkTeamPassword,
  clearSession,
  isCompanyEmail,
  loginViaCrm,
  makeSession,
  readSession,
} from "./auth";
import { SYSTEM_PROMPT, clipHistory, jobPrompt, sanitizeReply } from "./brain";
import { ASK_FOR_ZIP, PULL_FAILED, detectCompetitorPull, pullContainerOne } from "./competitors";
import {
  appendNoteToMap,
  buildCreatedContact,
  crmGetBook,
  crmIngestProposal,
  crmSaveContactEdits,
  crmSaveContactsAdded,
  crmSaveDeals,
  crmSaveFollowups,
  crmSaveNotes,
  findContact,
  mergeFollowupMap,
  noteTimestamp,
  searchContacts,
} from "./crm";
import { liveCallPrompt, parseLiveCallDraft, scheduleLiveCall } from "./cte";
import {
  classifyInbound,
  followUpFromKind,
  mailNoteText,
  mergeContactEdit,
  outboundFollowup,
  resolveMailContact,
  stageAfterOutbound,
  upsertDealStage,
} from "./mail";
import { pageHtml } from "./page";
import { listTemplates, renderTemplate } from "./templates";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY },
  });
}

function withCookies(status: number, body: unknown, cookies: string[]): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    ...SECURITY,
  });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

function html(): Response {
  return new Response(pageHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      ...SECURITY,
    },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function extractReply(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const rec = result as { response?: unknown; result?: { response?: unknown } };
  if (typeof rec.response === "string") return rec.response;
  if (rec.result && typeof rec.result.response === "string") return rec.result.response;
  return "";
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function publicUser(user: { email: string; name: string; crm?: string }): { email: string; name: string; crm: boolean } {
  return { email: user.email, name: user.name, crm: Boolean(user.crm) };
}

function fieldMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const val = str(v);
    if (val) out[k] = val.slice(0, 2000);
  }
  return out;
}

async function runModel(
  env: Env,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  });
  const allowed = [userMessage, ...history.map((m) => m.content)].join("\n");
  return sanitizeReply(extractReply(result), allowed);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: SECURITY });
    }

    if (request.method === "GET" && (path === "/" || path === "/index.html")) {
      return html();
    }

    if (request.method === "GET" && path === "/session") {
      const user = await readSession(request, env);
      return json(
        200,
        user
          ? { ok: true, user: publicUser(user) }
          : { ok: false },
      );
    }

    if (request.method === "POST" && path === "/auth/login") {
      if (!env.AUTH_SECRET) {
        return json(500, { error: "Desk is not set up yet." });
      }
      const body = await readJson(request);
      const email = str(body.email).toLowerCase();
      const password = str(body.password);
      if (!password) return json(401, { error: "Enter your password." });

      if (email && isCompanyEmail(email)) {
        const crm = await loginViaCrm(env, email, password);
        if (!crm.ok) return json(crm.status, { error: crm.error });
        return withCookies(200, { ok: true, user: publicUser(crm.user) }, await makeSession(request, env, crm.user));
      }

      if (!email && (await checkTeamPassword(env, password))) {
        const user = { email: "team@cbshippingsolutions.com", name: "CBSS Team" };
        return withCookies(200, { ok: true, user: publicUser(user) }, await makeSession(request, env, user));
      }

      return json(401, { error: "Use your company email and CRM password." });
    }

    if (request.method === "POST" && path === "/auth/logout") {
      return withCookies(200, { ok: true }, clearSession(request));
    }

    if (request.method === "GET" && path === "/contacts") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      if (!user.crm) return json(403, { error: "Sign in with your company email so the desk can open the CRM." });
      try {
        const book = await crmGetBook(env, user.crm);
        const q = url.searchParams.get("q") || "";
        return json(200, { ok: true, contacts: searchContacts(book, q, user.email, user.name) });
      } catch (err) {
        console.error("desk_contacts_error", err instanceof Error ? err.message : "unknown");
        return json(502, { error: "Could not read the CRM. Try again." });
      }
    }

    if (request.method === "POST" && path === "/call/save") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      if (!user.crm) return json(403, { error: "Sign in with your company email so the desk can write the CRM." });
      const body = await readJson(request);
      const scraps = str(body.scraps);
      if (!scraps) return json(400, { error: "Feed the call scraps first." });
      if (scraps.length > 8000) return json(400, { error: "Keep the scraps shorter." });
      const markedPast = Boolean(body.pastCte);
      const userNext = str(body.nextAction);
      const userWhen = str(body.followUpDate);

      try {
        const book = await crmGetBook(env, user.crm);
        let contactId = str(body.contactId);
        let created: { id: string; name: string } | null = null;
        if (!contactId) {
          const createRaw = body.create && typeof body.create === "object" ? (body.create as Record<string, unknown>) : {};
          const newName = str(createRaw.name);
          if (!newName) return json(400, { error: "Pick a contact or type a name to add one." });
          const fresh = buildCreatedContact({
            name: newName,
            phone: str(createRaw.phone),
            email: str(createRaw.email),
            city: str(createRaw.city),
            state: str(createRaw.state),
            zip: str(createRaw.zip),
            owner: user.name || "Desk",
          });
          const added = [fresh, ...(book.contactsAdded || [])];
          await crmSaveContactsAdded(env, user.crm, added);
          book.contactsAdded = added;
          contactId = String(fresh.id);
          created = { id: contactId, name: String(fresh.name || newName) };
        }

        const contact = findContact(book, contactId);
        if (!contact) return json(404, { error: "That contact is not in the CRM." });

        const prompt = liveCallPrompt({
          scraps,
          pastCte: markedPast,
          contactName: String(contact.name || ""),
          phone: String(contact.phone || ""),
          email: String(contact.email || ""),
          city: String(contact.city || ""),
          zip: String(contact.zip || ""),
          stage: String(contact.status || ""),
        });
        let modelRaw = "";
        try {
          modelRaw = await runModel(env, prompt, [], 700);
        } catch (err) {
          console.error("desk_call_ai_error", err instanceof Error ? err.message : "unknown");
        }
        const draft = parseLiveCallDraft(modelRaw, scraps, markedPast);
        const pastCte = markedPast || draft.pastCte;
        const schedule = scheduleLiveCall({
          pastCte,
          nextAction: userNext || draft.nextAction,
          followUpDate: userWhen || draft.followUpDate,
        });
        const allowed = [scraps, prompt, userNext, String(contact.name || "")].join("\n");
        const safeNote = sanitizeReply(`${draft.crmNote.trim()}\n\n${schedule.noteSuffix}`, allowed);
        const entry = {
          author: user.name || "Desk",
          timestamp: noteTimestamp(),
          tag: "Desk",
          text: safeNote,
        };
        const notes = appendNoteToMap(book.notes, contactId, entry);
        await crmSaveNotes(env, user.crm, notes);
        const followups = mergeFollowupMap(book.followups, contactId, {
          nextAction: schedule.nextAction,
          followUpDate: schedule.followUpDate,
        });
        await crmSaveFollowups(env, user.crm, followups);

        return json(200, {
          ok: true,
          summary: sanitizeReply(draft.summary, allowed),
          note: entry.text,
          pastCte: schedule.pastCte,
          ctePlan: schedule.ctePlan,
          nextAction: schedule.nextAction,
          followUpDate: schedule.followUpDate,
          contact: {
            id: contactId,
            name: String(contact.name || created?.name || "Contact"),
          },
          created: Boolean(created),
        });
      } catch (err) {
        console.error("desk_call_save_error", err instanceof Error ? err.message : "unknown");
        return json(502, { error: "Could not save to the CRM. Nothing was overwritten blindly. Try again." });
      }
    }

    if (request.method === "GET" && path === "/templates") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      return json(200, { ok: true, templates: listTemplates() });
    }

    if (request.method === "POST" && path === "/templates/render") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const vars = body.vars && typeof body.vars === "object" ? (body.vars as Record<string, unknown>) : body;
      const rendered = renderTemplate(str(body.id), {
        firstName: str(vars.firstName),
        what: str(vars.what),
        zip: str(vars.zip),
        price: str(vars.price),
        site: str(vars.site),
        day: str(vars.day),
        note: str(vars.note),
      });
      if (!rendered) return json(404, { error: "That template is not on the desk." });
      return json(200, { ok: true, ...rendered });
    }

    if (request.method === "POST" && path === "/mail/log") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      if (!user.crm) return json(403, { error: "Sign in with your company email so the desk can write the CRM." });
      const body = await readJson(request);
      const direction = str(body.direction) === "received" ? "received" : "sent";
      const hasProposal = Boolean(body.hasProposal) || str(body.templateId) === "proposal-attached";
      try {
        const book = await crmGetBook(env, user.crm);
        const contact = resolveMailContact(book, str(body.contactId), str(body.from) || str(body.to) || str(body.email));
        if (!contact) return json(404, { error: "Pick a CRM contact or use the email on the lead." });
        const kind = direction === "received" ? classifyInbound(str(body.subject), str(body.body)) : "other";
        const plan =
          direction === "received"
            ? followUpFromKind(kind)
            : { ...outboundFollowup(hasProposal), stage: stageAfterOutbound(hasProposal) };
        const note = {
          author: user.name || "Desk",
          timestamp: noteTimestamp(),
          tag: direction === "sent" ? "Email Sent" : "Email In",
          text: mailNoteText({
            direction,
            subject: str(body.subject),
            body: str(body.body),
            from: str(body.from) || str(body.email),
            templateId: str(body.templateId),
            kind: direction === "received" ? kind : undefined,
          }),
        };
        const notes = appendNoteToMap(book.notes, String(contact.id), note);
        await crmSaveNotes(env, user.crm, notes);
        if (plan.nextAction) {
          await crmSaveFollowups(
            env,
            user.crm,
            mergeFollowupMap(book.followups, String(contact.id), {
              nextAction: plan.nextAction,
              followUpDate: plan.followUpDate,
            }),
          );
        }
        if (plan.stage) {
          await crmSaveDeals(env, user.crm, upsertDealStage(book.deals, contact, plan.stage));
          await crmSaveContactEdits(
            env,
            user.crm,
            mergeContactEdit(book.contactEdits, String(contact.id), {
              status: plan.stage,
              lastActivity: note.timestamp,
            }),
          );
        }
        let ingested: Record<string, unknown> | null = null;
        if (direction === "sent" && hasProposal) {
          ingested = await crmIngestProposal(env, user.crm, {
            customerName: String(contact.name || ""),
            email: String(contact.email || str(body.to) || ""),
            phone: String(contact.phone || ""),
            zip: String(contact.zip || str(body.zip) || ""),
            containerDesc: str(body.what) || str(body.containerDesc),
            containerSize: str(body.size) || str(body.containerSize),
            amount: str(body.amount),
            unitPrice: str(body.amount),
            status: "sent",
            paymentMode: "cash",
            repName: user.name || "Desk",
            notes: str(body.subject) || "Proposal sent from Desk",
          });
        }
        return json(200, {
          ok: true,
          contact: { id: String(contact.id), name: String(contact.name || "") },
          kind: direction === "received" ? kind : "sent",
          nextAction: plan.nextAction,
          followUpDate: plan.followUpDate,
          stage: plan.stage,
          note: note.text,
          ingested: Boolean(ingested && ingested.ok),
        });
      } catch (err) {
        console.error("desk_mail_log_error", err instanceof Error ? err.message : "unknown");
        return json(502, { error: "Could not write the email into the CRM. Notes were not replaced blindly." });
      }
    }

    if (request.method === "POST" && path === "/inbox-sync") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      if (!user.crm) return json(403, { error: "Sign in with your company email so the desk can write the CRM." });
      const body = await readJson(request);
      const rows = Array.isArray(body.messages) ? body.messages : [];
      if (!rows.length) {
        return json(200, {
          ok: true,
          matched: 0,
          skipped: 0,
          note: "Paste the customer email under Email templates → Log a reply.",
        });
      }
      try {
        const book = await crmGetBook(env, user.crm);
        let notes = book.notes;
        let followups = book.followups;
        let deals = book.deals;
        let edits = book.contactEdits;
        let matched = 0;
        let skipped = 0;
        const results: Array<{ from: string; name: string; kind: string }> = [];
        for (const raw of rows.slice(0, 40)) {
          if (!raw || typeof raw !== "object") continue;
          const row = raw as Record<string, unknown>;
          const from = str(row.from) || str(row.email);
          const contact = resolveMailContact(book, str(row.contactId), from);
          if (!contact) {
            skipped += 1;
            continue;
          }
          const kind = classifyInbound(str(row.subject), str(row.body) || str(row.snippet));
          const plan = followUpFromKind(kind);
          const note = {
            author: user.name || "Desk",
            timestamp: noteTimestamp(),
            tag: "Email In",
            text: mailNoteText({
              direction: "received",
              subject: str(row.subject),
              body: str(row.body) || str(row.snippet),
              from,
              kind,
            }),
          };
          notes = appendNoteToMap(notes, String(contact.id), note);
          if (plan.nextAction) {
            followups = mergeFollowupMap(followups, String(contact.id), {
              nextAction: plan.nextAction,
              followUpDate: plan.followUpDate,
            });
          }
          if (plan.stage) {
            deals = upsertDealStage(deals, contact, plan.stage);
            edits = mergeContactEdit(edits, String(contact.id), {
              status: plan.stage,
              lastActivity: note.timestamp,
            });
          }
          matched += 1;
          results.push({ from, name: String(contact.name || ""), kind });
        }
        if (matched) {
          await crmSaveNotes(env, user.crm, notes);
          await crmSaveFollowups(env, user.crm, followups);
          await crmSaveDeals(env, user.crm, deals);
          await crmSaveContactEdits(env, user.crm, edits);
        }
        return json(200, { ok: true, matched, skipped, results });
      } catch (err) {
        console.error("desk_inbox_sync_error", err instanceof Error ? err.message : "unknown");
        return json(502, { error: "Could not sync those emails into the CRM." });
      }
    }

    if (request.method === "POST" && path === "/comp/container-one") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const zip = str(body.zip) || url.searchParams.get("zip") || "";
      const result = await pullContainerOne(zip);
      if (!result.ok) return json(200, { ok: false, reply: result.error });
      return json(200, { ok: true, reply: result.card, zip: result.pull.zip });
    }

    if (request.method === "POST" && (path === "/chat" || path === "/job")) {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);

      let message = str(body.message);
      const job = str(body.job);
      if (path === "/job") {
        if (!job) return json(400, { error: "Pick a job." });
        message = jobPrompt(job, fieldMap(body.fields));
      }
      if (!message) return json(400, { error: "Type a question or fill the form." });
      if (message.length > 6000) return json(400, { error: "Keep it shorter." });

      const history = clipHistory(body.history);
      if (path === "/chat") {
        const intent = detectCompetitorPull(message, history);
        if (intent) {
          if ("needZip" in intent) return json(200, { reply: ASK_FOR_ZIP });
          try {
            const result = await pullContainerOne(intent.zip);
            return json(200, { reply: result.ok ? result.card : result.error });
          } catch (err) {
            console.error("desk_comp_error", err instanceof Error ? err.message : "unknown");
            return json(200, { reply: PULL_FAILED });
          }
        }
      }
      try {
        const reply = await runModel(env, message, history, path === "/job" ? 900 : 600);
        return json(200, { reply });
      } catch (err) {
        console.error("brain_ai_error", err instanceof Error ? err.message : "unknown");
        return json(502, {
          error: "The desk is busy. Text Christopher at 870-323-2593 if you need a live answer.",
        });
      }
    }

    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
