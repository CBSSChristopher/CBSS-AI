import { EmailMessage } from "cloudflare:email";
import { parseInquiry, validateInquiry, inquiryText, officeMail } from "./request.js";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const FROM = ["requests", "cbshippingsolutions.app"].join("@");

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
  const subject = "Website request · " + data.company + " · " + data.zip;
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.cbshippingsolutions.app") {
      url.hostname = "cbshippingsolutions.app";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === "/quote" || url.pathname === "/quote.html") {
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
      if (env.WEB_INQUIRIES) {
        await env.WEB_INQUIRIES.put("inq:" + id, JSON.stringify(record));
        await env.WEB_INQUIRIES.put(rlKey, "1", { expirationTtl: 60 });
      }
      try {
        await notifyOffice(env, data, id);
      } catch {
        return json(200, {
          ok: true,
          id,
          warning: "We stored the request. If you do not hear back, call the office.",
        });
      }
      return json(200, { ok: true, id });
    }
    if (url.pathname === "/api/request") {
      return json(405, { ok: false, error: "POST only." });
    }
    return withSecurity(await env.ASSETS.fetch(request));
  },
};
