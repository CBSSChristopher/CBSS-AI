import { checkPassword, clearSession, makeSession, readSession } from "./auth";
import { SYSTEM_PROMPT, clipHistory, sanitizeReply } from "./brain";
import { pageHtml } from "./page";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function json(status: number, body: unknown, extra?: HeadersInit): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    ...SECURITY,
  });
  if (extra) {
    const e = extra instanceof Headers ? extra : new Headers(extra);
    e.forEach((v, k) => {
      if (k.toLowerCase() === "set-cookie") headers.append(k, v);
      else headers.set(k, v);
    });
  }
  return new Response(JSON.stringify(body), { status, headers });
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
      return json(200, { ok: await readSession(request, env) });
    }

    if (request.method === "POST" && path === "/auth/login") {
      if (!env.TEAM_PASSWORD || !env.AUTH_SECRET) {
        return json(500, { error: "Brain is not set up yet. Christopher needs to set the team password." });
      }
      const body = await readJson(request);
      const password = typeof body.password === "string" ? body.password : "";
      if (!(await checkPassword(env, password))) {
        return json(401, { error: "Wrong password." });
      }
      return withCookies(200, { ok: true }, await makeSession(request, env));
    }

    if (request.method === "POST" && path === "/auth/logout") {
      return withCookies(200, { ok: true }, clearSession(request));
    }

    if (request.method === "POST" && path === "/chat") {
      if (!(await readSession(request, env))) {
        return json(401, { error: "Sign in first." });
      }
      const body = await readJson(request);
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message) return json(400, { error: "Type a question." });
      if (message.length > 2000) return json(400, { error: "Keep it shorter." });

      const history = clipHistory(body.history);
      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...history,
        { role: "user" as const, content: message },
      ];

      try {
        const result = await env.AI.run(MODEL, {
          messages,
          max_tokens: 500,
          temperature: 0.2,
        });
        const reply = sanitizeReply(extractReply(result));
        return json(200, { reply });
      } catch (err) {
        console.error("brain_ai_error", err instanceof Error ? err.message : "unknown");
        return json(502, {
          error: "The Brain is busy. Text Christopher at 870-323-2593 if you need a live answer.",
        });
      }
    }

    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
