import { BRAND, titleOwner } from "./brand.ts";
import {
  clearSession,
  isCompanyEmail,
  loginAllTools,
  makeSession,
  origins,
  readSession,
  toolsReady,
  UA,
  type Env,
  type ToolKey,
} from "./auth.ts";
import { addCampaign, listCampaign, returnCampaign } from "./campaign.ts";
import { rewriteCrmWrite } from "./followups.ts";
import {
  FACEBOOK_TOKEN_KEY,
  isChristopherUser,
  publicFacebookStatus,
  readFacebookUpload,
} from "./facebook.ts";
import { lookupZipFromZippopotam, matchPostedBox, type BoxPick } from "./xchange-match.ts";
import { pageHtml } from "./page.ts";
import {
  buildDeskAddedContact,
  deskContactName,
  deskContactNote,
  findOwnDeskContact,
  readDeskContactDraft,
  scheduleDeskTrack,
} from "./desk-contact.ts";
import { buildModifiedSpec, readModifiedDraft } from "./modified-catalog.ts";
import { buildProposalSubmit, readProposalLine } from "./proposal-lines.ts";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000",
  "Alt-Svc": "clear",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'unsafe-inline'; img-src 'self' data: https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

const TOOLS: Record<ToolKey, { path: string }> = {
  crm: { path: "/x/crm" },
  desk: { path: "/x/desk" },
  proposal: { path: "/x/proposal" },
  pay: { path: "/x/pay" },
  invoice: { path: "/x/invoice" },
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY },
  });
}

function withCookies(status: number, body: unknown, cookies: string[]): Response {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", ...SECURITY });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

function html(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      ...SECURITY,
    },
  });
}

function yardPage(request: Request, opts?: { loginError?: string }): Response {
  const page = html(pageHtml(opts));
  if (request.method === "HEAD") return new Response(null, { status: 200, headers: page.headers });
  return page;
}

function isYardPagePath(path: string): boolean {
  return path === "/" || path === "/index.html" || path === "/auth/login";
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function readLoginBody(request: Request): Promise<Record<string, unknown>> {
  const ct = String(request.headers.get("Content-Type") || "").toLowerCase();
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      return {
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      };
    } catch {
      return {};
    }
  }
  return readJson(request);
}

function loginWantsRedirect(request: Request): boolean {
  const ct = String(request.headers.get("Content-Type") || "").toLowerCase();
  const accept = String(request.headers.get("Accept") || "").toLowerCase();
  return ct.includes("application/x-www-form-urlencoded") || (accept.includes("text/html") && !accept.includes("application/json"));
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function publicUser(user: { email: string; name: string; tools: { crm: string; desk: string; proposal: string; pay: string; invoice: string } }) {
  return { email: user.email, name: user.name, tools: toolsReady(user.tools) };
}

function matchTool(path: string): { key: ToolKey; rest: string } | null {
  for (const [key, spec] of Object.entries(TOOLS) as Array<[ToolKey, { path: string }]>) {
    if (path === spec.path || path.startsWith(spec.path + "/")) {
      return { key, rest: path.slice(spec.path.length) || "/" };
    }
  }
  return null;
}

async function stampCrmFollowupBody(request: Request): Promise<ArrayBuffer> {
  const buf = await request.arrayBuffer();
  try {
    const text = new TextDecoder().decode(buf);
    if (!text.trim()) return buf;
    const body = JSON.parse(text) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) return buf;
    const action = String(body.action || new URL(request.url).searchParams.get("action") || "").trim();
    const next = rewriteCrmWrite(action, body);
    if (next === body) return buf;
    return new TextEncoder().encode(JSON.stringify(next)).buffer as ArrayBuffer;
  } catch {
    return buf;
  }
}

async function proxyTool(request: Request, env: Env, key: ToolKey, rest: string): Promise<Response> {
  const user = await readSession(request, env);
  if (!user) return json(401, { error: "Sign in first." });
  const cookie = user.tools[key];
  if (!cookie) return json(503, { error: "That module did not sign in. Sign out and sign in again." });
  const o = origins(env);
  const target = o[key] + rest + (new URL(request.url).search || "");
  const headers = new Headers();
  headers.set("User-Agent", UA);
  headers.set("Origin", o[key]);
  headers.set("Accept", request.headers.get("Accept") || "application/json");
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cookie", cookie);
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = key === "crm" ? await stampCrmFollowupBody(request) : await request.arrayBuffer();
  }
  const binding =
    key === "crm" ? env.CRM
    : key === "desk" ? env.DESK
    : key === "proposal" ? env.PROPOSAL
    : key === "pay" ? env.PAY
    : env.INVOICE;
  const res = binding ? await binding.fetch(new Request(target, init)) : await fetch(target, init);
  const out = new Headers(res.headers);
  out.set("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(SECURITY)) out.set(k, v);
  out.delete("set-cookie");
  if (key === "invoice" && rest.startsWith("/invoice/document/")) {
    out.delete("X-Frame-Options");
    out.set(
      "Content-Security-Policy",
      SECURITY["Content-Security-Policy"].replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
    );
  }
  return new Response(res.body, { status: res.status, headers: out });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: SECURITY });
    if ((request.method === "GET" || request.method === "HEAD") && isYardPagePath(path)) {
      return yardPage(request);
    }

    if (request.method === "GET" && path === "/health") {
      return json(200, { ok: true, stamp: BRAND.stamp, live: origins(env) });
    }

    if (request.method === "GET" && path === "/session") {
      const user = await readSession(request, env);
      return json(200, user ? { ok: true, user: publicUser(user) } : { ok: false });
    }

    if (request.method === "POST" && path === "/auth/login") {
      const asPage = loginWantsRedirect(request);
      if (!env.AUTH_SECRET) {
        return asPage ? html(pageHtml({ loginError: "Platform is not set up yet." })) : json(500, { error: "Platform is not set up yet." });
      }
      const body = await readLoginBody(request);
      const email = str(body.email).toLowerCase();
      const password = str(body.password);
      const fail = (status: number, error: string) =>
        asPage ? html(pageHtml({ loginError: error })) : json(status, { error });
      if (!password) return fail(401, "Type your CRM password in the password box, then Open The Yard.");
      if (!email || !isCompanyEmail(email)) return fail(401, "Use your full company email — name@cbshippingsolutions.com.");
      const result = await loginAllTools(env, email, password);
      if (!result.ok) return fail(result.status, result.error || "Could not sign in.");
      const cookies = await makeSession(request, env, result.user);
      if (asPage) {
        const headers = new Headers({ Location: "/", ...SECURITY });
        for (const c of cookies) headers.append("Set-Cookie", c);
        return new Response(null, { status: 303, headers });
      }
      return withCookies(200, { ok: true, user: publicUser(result.user) }, cookies);
    }

    if (request.method === "POST" && path === "/auth/logout") {
      return withCookies(200, { ok: true }, await clearSession(request, env));
    }

    if (request.method === "GET" && path === "/campaign") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      return json(200, { ok: true, items: await listCampaign(env) });
    }

    if (request.method === "POST" && path === "/campaign/add") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const id = str(body.id || body.contactId);
      if (!id) return json(400, { error: "Pick a contact first." });
      const items = await addCampaign(env, {
        id,
        name: str(body.name),
        email: str(body.email),
        phone: str(body.phone),
        city: str(body.city),
        owner: str(body.owner),
        addedBy: user.name || user.email,
        addedAt: new Date().toISOString(),
      });
      return json(200, { ok: true, items });
    }

    if (request.method === "POST" && path === "/campaign/return") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const id = str(body.id || body.contactId);
      if (!id) return json(400, { error: "Pick a campaign lead first." });
      return json(200, { ok: true, items: await returnCampaign(env, id) });
    }

    if (request.method === "GET" && path === "/geo/zip") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const zip = url.searchParams.get("code") || "";
      const digits = zip.replace(/\D/g, "").slice(0, 5);
      if (digits.length !== 5) return json(400, { error: "Type a 5-digit ZIP." });
      const res = await fetch("https://api.zippopotam.us/us/" + digits, { headers: { "User-Agent": UA } });
      if (!res.ok) return json(404, { error: "Could not find that ZIP." });
      const geo = lookupZipFromZippopotam(await res.json() as { places?: Array<Record<string, string>> });
      if (!geo) return json(404, { error: "Could not find that ZIP." });
      return json(200, { ok: true, zip: digits, ...geo });
    }

    if (request.method === "GET" && path === "/facebook/status") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      if (!isChristopherUser(user.email, user.name)) {
        return json(403, { error: "Only Christopher can open Facebook credentials." });
      }
      const crmReq = new Request(new URL("/x/crm/crm-data", request.url), {
        method: "POST",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "getMetaStatus" }),
      });
      const crmRes = await proxyTool(crmReq, env, "crm", "/crm-data");
      const crm = await crmRes.json().catch(() => ({})) as {
        appId?: string;
        hasAppSecret?: boolean;
        webhookUrl?: string;
      };
      const stored = env.SESSIONS ? await env.SESSIONS.get(FACEBOOK_TOKEN_KEY) : "";
      return json(200, {
        ok: true,
        ...publicFacebookStatus({
          appId: crm.appId,
          hasAppSecret: crm.hasAppSecret,
          hasClientToken: Boolean(stored && String(stored).trim()),
          webhookUrl: crm.webhookUrl,
        }),
      });
    }

    if (request.method === "POST" && path === "/facebook/save") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      if (!isChristopherUser(user.email, user.name)) {
        return json(403, { error: "Only Christopher can upload Facebook credentials." });
      }
      const uploaded = readFacebookUpload(await readJson(request));
      if (!uploaded.appId && !uploaded.appSecret && !uploaded.clientToken) {
        return json(400, { error: "Paste the App ID, app secret, or client token." });
      }
      if (uploaded.appId || uploaded.appSecret) {
        const crmReq = new Request(new URL("/x/crm/crm-data", request.url), {
          method: "POST",
          headers: {
            Cookie: request.headers.get("Cookie") || "",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "saveMetaConfig",
            appId: uploaded.appId,
            appSecret: uploaded.appSecret,
          }),
        });
        const crmRes = await proxyTool(crmReq, env, "crm", "/crm-data");
        const crm = await crmRes.json().catch(() => ({})) as { error?: string };
        if (!crmRes.ok) return json(crmRes.status, { error: crm.error || "Could not save the Facebook app to CRM." });
      }
      if (uploaded.clientToken && env.SESSIONS) {
        await env.SESSIONS.put(FACEBOOK_TOKEN_KEY, uploaded.clientToken);
      }
      const checkReq = new Request(new URL("/x/crm/crm-data", request.url), {
        method: "POST",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "getMetaStatus" }),
      });
      const checkRes = await proxyTool(checkReq, env, "crm", "/crm-data");
      const check = await checkRes.json().catch(() => ({})) as {
        appId?: string;
        hasAppSecret?: boolean;
        webhookUrl?: string;
      };
      const stored = env.SESSIONS ? await env.SESSIONS.get(FACEBOOK_TOKEN_KEY) : "";
      return json(200, {
        ok: true,
        ...publicFacebookStatus({
          appId: check.appId || uploaded.appId,
          hasAppSecret: Boolean(check.hasAppSecret || uploaded.appSecret),
          hasClientToken: Boolean(stored && String(stored).trim()),
          webhookUrl: check.webhookUrl,
        }),
      });
    }

    if (request.method === "POST" && path === "/desk/contact") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const draft = readDeskContactDraft(await readJson(request));
      const name = deskContactName(draft);
      if (!draft.firstName || !draft.lastName || !name) {
        return json(400, { error: "Type first and last name." });
      }
      const owner = titleOwner(user.name || user.email) || user.name || user.email;
      const getReq = new Request(new URL("/x/crm/crm-data?action=get&omitNotes=1", request.url), {
        method: "GET",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
        },
      });
      const getRes = await proxyTool(getReq, env, "crm", "/crm-data");
      const book = await getRes.json().catch(() => ({})) as {
        contacts?: Array<Record<string, unknown>>;
        contactsAdded?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!getRes.ok) return json(getRes.status, { error: book.error || "Could not read the CRM." });
      const added = Array.isArray(book.contactsAdded) ? book.contactsAdded.slice() : [];
      const pool = added.concat(Array.isArray(book.contacts) ? book.contacts : []);
      const plan = scheduleDeskTrack(draft);
      const existing = findOwnDeskContact(pool, draft, owner);
      let contact: Record<string, unknown>;
      let created = false;
      if (existing && existing.id != null) {
        contact = existing;
      } else {
        contact = buildDeskAddedContact(draft, owner);
        contact.status = plan.stage;
        contact.nextAction = plan.nextAction;
        contact.followUpDate = plan.followUpDate;
        added.unshift(contact);
        const saveReq = new Request(new URL("/x/crm/crm-data", request.url), {
          method: "POST",
          headers: {
            Cookie: request.headers.get("Cookie") || "",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "saveContactsAdded", contactsAdded: added }),
        });
        const saveRes = await proxyTool(saveReq, env, "crm", "/crm-data");
        const saved = await saveRes.json().catch(() => ({})) as { error?: string };
        if (!saveRes.ok) return json(saveRes.status, { error: saved.error || "Could not save the contact to the CRM." });
        created = true;
      }
      const id = String(contact.id);
      const edits: Record<string, Record<string, unknown>> = {};
      edits[id] = { status: plan.stage, nextAction: plan.nextAction, followUpDate: plan.followUpDate };
      const followups: Record<string, Record<string, unknown>> = {};
      followups[id] = { nextAction: plan.nextAction, followUpDate: plan.followUpDate, completed: false, status: "open" };
      const extraReq = new Request(new URL("/x/crm/crm-data", request.url), {
        method: "POST",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "saveContactEdits", contactEdits: edits }),
      });
      const extraRes = await proxyTool(extraReq, env, "crm", "/crm-data");
      if (!extraRes.ok) {
        const extra = await extraRes.json().catch(() => ({})) as { error?: string };
        return json(extraRes.status, { error: extra.error || "Contact is on the book. Stage did not save. Try again.", contact, created });
      }
      const fuReq = new Request(new URL("/x/crm/crm-data?action=saveFollowups", request.url), {
        method: "POST",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "saveFollowups", followups }),
      });
      const fuRes = await proxyTool(fuReq, env, "crm", "/crm-data");
      if (!fuRes.ok) {
        const fu = await fuRes.json().catch(() => ({})) as { error?: string };
        return json(fuRes.status, { error: fu.error || "Contact is on the book. The follow-up did not save. Try again.", contact, created });
      }
      const noteText = deskContactNote(draft.notes, plan);
      const noteReq = new Request(new URL("/x/crm/crm-data", request.url), {
        method: "POST",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "appendNote",
          contactId: id,
          text: noteText,
          tag: "Desk",
        }),
      });
      const noteRes = await proxyTool(noteReq, env, "crm", "/crm-data");
      if (!noteRes.ok) {
        const note = await noteRes.json().catch(() => ({})) as { error?: string };
        return json(noteRes.status, {
          error: note.error || "Contact is on the book. The note did not save. Try again.",
          contact,
          created,
        });
      }
      contact.status = plan.stage;
      contact.nextAction = plan.nextAction;
      contact.followUpDate = plan.followUpDate;
      return json(200, {
        ok: true,
        created,
        reused: !created,
        track: plan.track,
        stage: plan.stage,
        contact,
        summary: created
          ? (plan.track === "followup" ? "Saved to CRM. Follow-up booked." : "Saved to CRM. CTE booked.")
          : "That contact is already on your book. CTE or follow-up updated.",
      });
    }

    if (request.method === "POST" && path === "/modified/spec") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const draft = readModifiedDraft(body);
      const spec = buildModifiedSpec(draft);
      if (!spec.ok) return json(400, { error: spec.error || "Pick the box or at least one modification first." });
      const contactId = String(body.contactId == null ? "" : body.contactId).trim();
      if (contactId) {
        const noteReq = new Request(new URL("/x/crm/crm-data", request.url), {
          method: "POST",
          headers: {
            Cookie: request.headers.get("Cookie") || "",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "appendNote",
            contactId,
            text: spec.text,
            tag: "Modified",
          }),
        });
        const noteRes = await proxyTool(noteReq, env, "crm", "/crm-data");
        if (!noteRes.ok) {
          const note = await noteRes.json().catch(() => ({})) as { error?: string };
          return json(noteRes.status, { error: note.error || "Spec is ready. The CRM note did not save. Try again.", spec });
        }
      }
      return json(200, { ok: true, spec, saved: Boolean(contactId) });
    }

    if (request.method === "POST" && path === "/proposal/submit") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const raw = await readJson(request);
      const rawLines = Array.isArray(raw.lines) ? raw.lines : [];
      const lines = rawLines
        .map((row) => (row && typeof row === "object" ? readProposalLine(row as Record<string, unknown>) : null))
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      const built = buildProposalSubmit({
        customerName: raw.customerName,
        email: raw.email,
        phone: raw.phone,
        company: raw.company,
        zip: raw.zip,
        delivery: raw.delivery,
        notes: raw.notes,
        clientType: raw.clientType,
        paymentMode: raw.paymentMode,
        fulfillment: raw.fulfillment,
        repName: raw.repName || user.name,
        repEmail: raw.repEmail || user.email,
        lines,
      });
      if (!built.ok || !built.body) return json(400, { error: built.error || "Could not build that proposal." });
      const sendReq = new Request(new URL("/x/proposal/submit-proposal", request.url), {
        method: "POST",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(built.body),
      });
      const sendRes = await proxyTool(sendReq, env, "proposal", "/submit-proposal");
      const sent = await sendRes.json().catch(() => ({})) as { status?: string; error?: string; message?: string };
      if (!sendRes.ok) {
        return json(sendRes.status, {
          error: sent.error || sent.message || "The proposal tool did not write that proposal.",
          message: sent.message,
        });
      }
      return json(200, {
        ok: true,
        status: sent.status || "sent",
        desc: built.body.containerDesc,
        quantity: built.body.quantity,
        unitPrice: built.body.unitPrice,
      });
    }

    if (request.method === "POST" && path === "/quote/match") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const zip = str(body.zip).replace(/\D/g, "").slice(0, 5);
      if (zip.length !== 5) return json(400, { error: "Type the client ZIP first." });
      const geoRes = await fetch("https://api.zippopotam.us/us/" + zip, { headers: { "User-Agent": UA } });
      if (!geoRes.ok) return json(404, { error: "Could not find that ZIP." });
      const geo = lookupZipFromZippopotam(await geoRes.json() as { places?: Array<Record<string, string>> });
      if (!geo) return json(404, { error: "Could not find that ZIP." });
      const refresh = body.refresh === true;
      const invReq = new Request(new URL(refresh ? "/x/proposal/inventory/refresh" : "/x/proposal/inventory", request.url), {
        method: refresh ? "POST" : "GET",
        headers: {
          Cookie: request.headers.get("Cookie") || "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: refresh ? "{}" : undefined,
      });
      const invRes = await proxyTool(invReq, env, "proposal", refresh ? "/inventory/refresh" : "/inventory");
      const inv = await invRes.json().catch(() => ({})) as { offers?: unknown[]; items?: unknown[]; error?: string; pulledAt?: string };
      const offers = Array.isArray(inv.offers) ? inv.offers : Array.isArray(inv.items) ? inv.items : [];
      const want: BoxPick = {
        size: str(body.size) || "40",
        height: str(body.height) || "HC",
        config: str(body.config) || "standard",
        grade: str(body.grade) || "CW",
      };
      const qty = Math.max(1, Number(body.qty) || 1);
      const fulfillment = str(body.fulfillment) || "deliver";
      const hit = matchPostedBox(offers as never[], want, geo, qty, fulfillment);
      return json(hit.ok ? 200 : 404, {
        ...hit,
        zip,
        place: geo.place,
        pulledAt: inv.pulledAt || "",
        offers: offers.length,
        refreshStatus: invRes.status,
      });
    }

    const tool = matchTool(path);
    if (tool) return proxyTool(request, env, tool.key, tool.rest);

    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
