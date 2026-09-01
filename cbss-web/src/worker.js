import { EmailMessage } from "cloudflare:email";
import { inlineBrandCss } from "./brand-html.js";
import { cacheControl } from "./cache.js";
import {
  collectionResult,
  crmIngestBody,
  inquiryText,
  officeMail,
  parseInquiry,
  validateInquiry,
} from "./request.js";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Chrome caches HTTP/3 from alt-svc; a failed QUIC hop shows ERR_CONNECTION_CLOSED.
  "Alt-Svc": "clear",
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const FROM = ["requests", "cbshippingsolutions.app"].join("@");
const CRM_INGEST = "https://cbsscrm.cbss.workers.dev/crm-data";

function withSecurity(res) {
  const out = new Response(res.body, res);
  for (const [key, value] of Object.entries(SECURITY)) out.headers.set(key, value);
  return out;
}

function json(status, payload) {
  return withSecurity(new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS }));
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return request.json();
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

async function notifyOffice(env, data, id) {
  const to = officeMail();
  const text = inquiryText(data, id);
  const subject = "Website request · " + (data.company || data.name) + " · " + data.zip;
  if (env.EMAIL) {
    const raw = [
      "From: CBSS Website <" + FROM + ">",
      "To: " + to,
      "Subject: " + subject,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      text,
    ].join("\r\n");
    await env.EMAIL.send(new EmailMessage(FROM, to, raw));
    return;
  }
  throw new Error("no-email-binding");
}

async function notifyCrm(env, data, id) {
  const url = (env && env.CRM_INGEST_URL) || CRM_INGEST;
  const secret = (env && env.CRM_INGEST_SECRET) || "";
  if (!secret) throw new Error("no-crm-secret");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-secret": secret,
      Origin: "https://cbsscrm.cbss.workers.dev",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(crmIngestBody(data, id)),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || "crm-ingest-" + res.status);
  return body;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.cbshippingsolutions.app") {
      url.hostname = "cbshippingsolutions.app";
      return Response.redirect(url.toString(), 301);
    }
    if (
      url.pathname === "/quote" ||
      url.pathname === "/quote.html" ||
      url.pathname === "/contact" ||
      url.pathname === "/contact.html"
    ) {
      return withSecurity(Response.redirect(new URL("/request", url), 301));
    }
    if (url.pathname === "/api/request" && request.method === "POST") {
      let raw;
      try {
        raw = await readBody(request);
      } catch {
        return json(400, { ok: false, error: "The form did not send usable data." });
      }
      const data = parseInquiry(raw);
      const error = validateInquiry(data);
      if (error) return json(400, { ok: false, error });
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const rlKey = "rl:" + ip;
      if (env.WEB_INQUIRIES && (await env.WEB_INQUIRIES.get(rlKey))) {
        return json(429, { ok: false, error: "Wait a minute and send it again." });
      }
      const id = Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8);
      const record = { id, at: new Date().toISOString(), ip, ...data };
      delete record.honey;
      let stored = false;
      if (env.WEB_INQUIRIES) {
        await env.WEB_INQUIRIES.put("inq:" + id, JSON.stringify(record));
        await env.WEB_INQUIRIES.put(rlKey, "1", { expirationTtl: 60 });
        stored = true;
      }
      let emailed = false;
      try {
        await notifyOffice(env, data, id);
        emailed = true;
      } catch (_) {}
      let crmOk = false;
      let contactId = "";
      try {
        const crm = await notifyCrm(env, data, id);
        crmOk = Boolean(crm && crm.ok);
        contactId = crm && crm.contactId != null ? String(crm.contactId) : "";
      } catch (_) {}
      const result = collectionResult({ stored, emailed, crmOk });
      if (!result.ok) {
        return json(500, { ok: false, error: result.error, id });
      }
      return json(200, {
        ok: true,
        id,
        stored: result.stored,
        emailed: result.emailed,
        crm: result.crm,
        contactId,
        warning: result.emailed ? "" : "We kept the request. If you do not hear back, call the office.",
      });
    }
    if (url.pathname === "/api/request") {
      return json(405, { ok: false, error: "POST only." });
    }
    const asset = withSecurity(await env.ASSETS.fetch(request));
    const type = asset.headers.get("content-type") || "";
    if (type.includes("text/html")) {
      const html = await asset.text();
      const cssRes = await env.ASSETS.fetch(new Request(new URL("/styles.css", request.url)));
      const css = cssRes.ok ? await cssRes.text() : "";
      const branded = inlineBrandCss(html, css);
      const page = withSecurity(
        new Response(branded, {
          status: asset.status,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
      page.headers.set("Cache-Control", cacheControl(url.pathname, "text/html"));
      return page;
    }
    const cached = new Response(asset.body, asset);
    cached.headers.set("Cache-Control", cacheControl(url.pathname, type));
    return cached;
  },
};
