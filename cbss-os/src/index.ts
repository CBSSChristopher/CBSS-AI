import { BRAND } from "./brand.ts";
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
import { pageHtml } from "./page.ts";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'self'; frame-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
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
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
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
  return new Response(res.body, { status: res.status, headers: out });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: SECURITY });
    if (request.method === "GET" && (path === "/" || path === "/index.html")) return html(pageHtml());

    if (request.method === "GET" && path === "/health") {
      return json(200, { ok: true, stamp: BRAND.stamp, live: origins(env) });
    }

    if (request.method === "GET" && path === "/session") {
      const user = await readSession(request, env);
      return json(200, user ? { ok: true, user: publicUser(user) } : { ok: false });
    }

    if (request.method === "POST" && path === "/auth/login") {
      if (!env.AUTH_SECRET) return json(500, { error: "Platform is not set up yet." });
      const body = await readJson(request);
      const email = str(body.email).toLowerCase();
      const password = str(body.password);
      if (!password) return json(401, { error: "Enter your password." });
      if (!email || !isCompanyEmail(email)) return json(401, { error: "Use your company email and CRM password." });
      const result = await loginAllTools(env, email, password);
      if (!result.ok) return json(result.status, { error: result.error });
      return withCookies(
        200,
        { ok: true, user: publicUser(result.user) },
        await makeSession(request, env, result.user),
      );
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

    const tool = matchTool(path);
    if (tool) return proxyTool(request, env, tool.key, tool.rest);

    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
