import {
  checkTeamPassword,
  clearSession,
  isCompanyEmail,
  loginViaCrm,
  makeSession,
  readSession,
} from "./auth";
import { SYSTEM_PROMPT, clipHistory, jobPrompt, sanitizeReply } from "./brain";
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
      return json(200, user ? { ok: true, user } : { ok: false });
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
        const crm = await loginViaCrm(email, password);
        if (!crm.ok) return json(crm.status, { error: crm.error });
        return withCookies(200, { ok: true, user: crm.user }, await makeSession(request, env, crm.user));
      }

      if (!email && (await checkTeamPassword(env, password))) {
        const user = { email: "team@cbshippingsolutions.com", name: "CBSS Team" };
        return withCookies(200, { ok: true, user }, await makeSession(request, env, user));
      }

      return json(401, { error: "Use your company email and CRM password." });
    }

    if (request.method === "POST" && path === "/auth/logout") {
      return withCookies(200, { ok: true }, clearSession(request));
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
