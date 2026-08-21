import { clearSession, isCompanyEmail, loginViaCrm, makeSession, readSession } from "./auth";
import { pageHtml } from "./page";
import { cancelPayment, completeDraft, createPayment, formatPaymentCard, listPayments, veemReady } from "./veem";

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

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function publicUser(user: { email: string; name: string }): { email: string; name: string } {
  return { email: user.email, name: user.name };
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: SECURITY });
    if (request.method === "GET" && (path === "/" || path === "/index.html")) return html();

    if (request.method === "GET" && path === "/session") {
      const user = await readSession(request, env);
      return json(200, user ? { ok: true, user: publicUser(user), veem: veemReady(env) } : { ok: false, veem: veemReady(env) });
    }

    if (request.method === "POST" && path === "/auth/login") {
      if (!env.AUTH_SECRET) return json(500, { error: "Pay is not set up yet." });
      const body = await readJson(request);
      const email = str(body.email).toLowerCase();
      const password = str(body.password);
      if (!password) return json(401, { error: "Enter your password." });
      if (!email || !isCompanyEmail(email)) return json(401, { error: "Use your company email and CRM password." });
      const crm = await loginViaCrm(env, email, password);
      if (!crm.ok) return json(crm.status, { error: crm.error });
      return withCookies(200, { ok: true, user: publicUser(crm.user), veem: veemReady(env) }, await makeSession(request, env, crm.user));
    }

    if (request.method === "POST" && path === "/auth/logout") {
      return withCookies(200, { ok: true }, clearSession(request));
    }

    if (request.method === "POST" && path === "/pay/create") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const draft = completeDraft({
        name: str(body.name),
        firstName: str(body.firstName),
        lastName: str(body.lastName),
        email: str(body.email),
        phone: str(body.phone),
        amountRaw: str(body.amountRaw) || str(body.amount),
        notes: str(body.notes),
        city: str(body.city),
        state: str(body.state),
        zip: str(body.zip),
        street: str(body.street),
      });
      if ("error" in draft) return json(200, { ok: false, error: draft.error });
      const result = await createPayment(env, draft);
      if (!result.ok) return json(200, { ok: false, error: result.error });
      return json(200, { ok: true, card: result.card, cardText: formatPaymentCard(result.card) });
    }

    if (request.method === "GET" && path === "/pay/list") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const result = await listPayments(env);
      if (!result.ok) return json(200, { ok: false, error: result.error });
      return json(200, { ok: true, cards: result.cards, veem: veemReady(env) });
    }

    if (request.method === "POST" && path === "/pay/cancel") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const result = await cancelPayment(env, str(body.id));
      if (!result.ok) return json(200, { ok: false, error: result.error });
      return json(200, { ok: true, card: result.card });
    }

    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
