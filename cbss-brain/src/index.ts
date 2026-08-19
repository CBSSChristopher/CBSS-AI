import {
  checkTeamPassword,
  clearSession,
  isCompanyEmail,
  loginViaCrm,
  makeSession,
  readSession,
} from "./auth";
import { SYSTEM_PROMPT, clipHistory, jobPrompt, sanitizeReply } from "./brain";
import {
  appendNoteToMap,
  buildCreatedContact,
  crmGetBook,
  crmSaveContactsAdded,
  crmSaveFollowups,
  crmSaveNotes,
  findContact,
  mergeFollowupMap,
  noteTimestamp,
  searchContacts,
} from "./crm";
import { liveCallPrompt, parseLiveCallDraft, scheduleLiveCall } from "./cte";
import { pageHtml } from "./page";

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
