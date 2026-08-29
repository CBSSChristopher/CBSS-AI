import { clearSession, isCompanyEmail, loginViaCrm, makeSession, readSession } from "./auth";
import { pageHtml, paidHtml } from "./page";
import {
  cancelInvoice,
  completeDraft,
  createInvoice,
  formatInvoiceCard,
  gmailDraft,
  invoiceCopyEmails,
  isAchPayMethod,
  listInvoices,
  money,
  rememberInvoice,
  waaveReady,
} from "./waave";
import { agreedProposalAmount } from "./lookup";
import {
  documentFromDraft,
  nextCbsNumber,
  parseItems,
  readDocument,
  renderInvoiceHtml,
  saveDocument,
} from "./document";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'self'; frame-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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

function publicUser(user: { email: string; name: string }): { email: string; name: string } {
  return { email: user.email, name: user.name };
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: SECURITY });
    if (request.method === "GET" && (path === "/" || path === "/index.html")) return html(pageHtml());
    if (request.method === "GET" && path === "/paid") return html(paidHtml());

    if (request.method === "GET" && path === "/session") {
      const user = await readSession(request, env);
      return json(200, user ? { ok: true, user: publicUser(user), waave: waaveReady(env) } : { ok: false, waave: waaveReady(env) });
    }

    if (request.method === "POST" && path === "/auth/login") {
      if (!env.AUTH_SECRET) return json(500, { error: "Invoicing is not set up yet." });
      const body = await readJson(request);
      const email = str(body.email).toLowerCase();
      const password = str(body.password);
      if (!password) return json(401, { error: "Enter your password." });
      if (!email || !isCompanyEmail(email)) return json(401, { error: "Use your company email and CRM password." });
      const crm = await loginViaCrm(env, email, password);
      if (!crm.ok) return json(crm.status, { error: crm.error });
      return withCookies(200, { ok: true, user: publicUser(crm.user), waave: waaveReady(env) }, await makeSession(request, env, crm.user));
    }

    if (request.method === "POST" && path === "/auth/logout") {
      return withCookies(200, { ok: true }, clearSession(request));
    }

    if (request.method === "POST" && path === "/invoice/lookup") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const cookie = user.crm ? "cbss_session=" + user.crm : "";
      const req = new Request("https://cbsscrm.cbss.workers.dev/crm-data?action=get&omitNotes=1", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Origin: "https://cbsscrm.cbss.workers.dev",
          Cookie: cookie,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      });
      try {
        const res = env.CRM ? await env.CRM.fetch(req) : await fetch(req);
        const book = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) return json(200, { ok: false, error: "Could not read CRM. Sign in again." });
        const found = agreedProposalAmount(book, str(body.email), str(body.phone));
        return json(200, found);
      } catch {
        return json(200, { ok: false, error: "Could not read CRM. Sign in again." });
      }
    }

    if (request.method === "POST" && path === "/invoice/create") {
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
        billingStreet: str(body.billingStreet) || str(body.street),
        billingCity: str(body.billingCity) || str(body.city),
        billingState: str(body.billingState) || str(body.state),
        billingZip: str(body.billingZip) || str(body.zip),
        deliveryStreet: str(body.deliveryStreet),
        deliveryCity: str(body.deliveryCity),
        deliveryState: str(body.deliveryState),
        deliveryZip: str(body.deliveryZip),
        sameAsBilling: body.sameAsBilling === true || body.sameAsBilling === "true",
      });
      if ("error" in draft) return json(200, { ok: false, error: draft.error });
      const items = parseItems(body.items, draft.notes, draft.amount);
      if ("error" in items) return json(200, { ok: false, error: items.error });
      const itemTotal = Math.round(items.reduce((sum, item) => sum + item.qty * item.unit, 0) * 100) / 100;
      if (itemTotal !== draft.amount) {
        return json(200, { ok: false, error: "Line items must add up to the invoice amount Christopher set." });
      }
      const number = str(body.invoiceNumber) || (await nextCbsNumber(env));
      const warrantyKind = str(body.warrantyKind) === "one-trip" ? "one-trip" : "wwt";
      const document = documentFromDraft(draft, {
        number,
        company: str(body.company),
        items,
        warrantyKind,
        banner: str(body.banner),
      });
      await saveDocument(env, document);
      const documentUrl = `${url.origin}/invoice/document/${encodeURIComponent(number)}`;
      const ccEmails = invoiceCopyEmails(user.email);
      const payMethod = isAchPayMethod(body.payMethod) ? "ach" : "card";
      const result =
        payMethod === "card" && waaveReady(env) ? await createInvoice(env, draft, url.origin, user.email) : null;
      const billLine = `${draft.billing.street}, ${draft.billing.city}, ${draft.billing.state} ${draft.billing.zip}`;
      const delLine = `${draft.delivery.street}, ${draft.delivery.city}, ${draft.delivery.state} ${draft.delivery.zip}`;
      const card = result && result.ok
        ? {
            ...result.card,
            payMethod: "card" as const,
            documentNumber: number,
            documentUrl,
            referenceId: number,
            gmailLink: gmailDraft(
              draft.email,
              `${draft.firstName} ${draft.lastName}`,
              draft.amount,
              result.card.payLink,
              draft.notes,
              ccEmails,
              billLine,
              delLine,
              number,
              "card",
            ),
          }
        : {
            id: number,
            status: payMethod === "ach" ? "ach" : "draft",
            amount: draft.amount,
            currency: "USD",
            email: draft.email,
            name: `${draft.firstName} ${draft.lastName}`,
            notes: draft.notes,
            payLink: "",
            payMethod,
            gmailLink: gmailDraft(
              draft.email,
              `${draft.firstName} ${draft.lastName}`,
              draft.amount,
              "",
              draft.notes,
              ccEmails,
              billLine,
              delLine,
              number,
              payMethod,
            ),
            referenceId: number,
            timeCreated: new Date().toISOString(),
            emailedByWaave: false,
            sentBy: user.email,
            ccEmails,
            billing: draft.billing,
            delivery: draft.delivery,
            documentNumber: number,
            documentUrl,
          };
      if (!(result && result.ok)) await rememberInvoice(env, card);
      const warn =
        payMethod === "ach"
          ? ""
          : result && !result.ok
            ? result.error
            : "";
      return json(200, {
        ok: true,
        card,
        cardText: formatInvoiceCard(card),
        document,
        documentUrl,
        documentNumber: number,
        payMethod,
        warn,
        amount: money(draft.amount),
      });
    }

    if (request.method === "GET" && path.startsWith("/invoice/document/")) {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const number = decodeURIComponent(path.slice("/invoice/document/".length)).trim();
      const document = await readDocument(env, number);
      if (!document) return json(404, { error: "Invoice not found." });
      return new Response(renderInvoiceHtml(document), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          ...SECURITY,
        },
      });
    }

    if (request.method === "GET" && path === "/invoice/list") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const result = await listInvoices(env);
      if (!result.ok) return json(200, { ok: false, error: result.error });
      return json(200, { ok: true, cards: result.cards, waave: waaveReady(env) });
    }

    if (request.method === "POST" && path === "/invoice/cancel") {
      const user = await readSession(request, env);
      if (!user) return json(401, { error: "Sign in first." });
      const body = await readJson(request);
      const result = await cancelInvoice(env, str(body.id));
      if (!result.ok) return json(200, { ok: false, error: result.error });
      return json(200, { ok: true, card: result.card });
    }

    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
