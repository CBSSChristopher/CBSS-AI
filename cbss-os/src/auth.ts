import { LIVE_TOOLS } from "./brand.ts";

const COOKIE = "cbss_os";
const MAX_AGE = 60 * 60 * 24 * 30;
const COMPANY_RE = /@cbshippingsolutions\.com$/i;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export type ToolKey = "crm" | "desk" | "proposal" | "pay" | "invoice";

export type ToolCookies = Record<ToolKey, string>;

export type ToolReady = Record<ToolKey, boolean>;

export type SessionUser = {
  email: string;
  name: string;
  tools: ToolCookies;
};

export type Env = {
  AUTH_SECRET?: string;
  CRM_ORIGIN?: string;
  DESK_ORIGIN?: string;
  PROPOSAL_ORIGIN?: string;
  PAY_ORIGIN?: string;
  INVOICE_ORIGIN?: string;
  SESSIONS?: KVNamespace;
  CRM?: Fetcher;
  DESK?: Fetcher;
  PROPOSAL?: Fetcher;
  PAY?: Fetcher;
  INVOICE?: Fetcher;
};

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - str.length % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function sign(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return b64urlEncode(sig);
}

function randomId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return b64urlEncode(bytes);
}

export function isCompanyEmail(email: string): boolean {
  return COMPANY_RE.test(String(email || "").trim());
}

export function origins(env: Env) {
  return {
    crm: String(env.CRM_ORIGIN || LIVE_TOOLS.crm).replace(/\/+$/, ""),
    desk: String(env.DESK_ORIGIN || LIVE_TOOLS.desk).replace(/\/+$/, ""),
    proposal: String(env.PROPOSAL_ORIGIN || LIVE_TOOLS.proposal).replace(/\/+$/, ""),
    pay: String(env.PAY_ORIGIN || LIVE_TOOLS.pay).replace(/\/+$/, ""),
    invoice: String(env.INVOICE_ORIGIN || LIVE_TOOLS.invoice).replace(/\/+$/, ""),
  };
}

export function emptyTools(): ToolCookies {
  return { crm: "", desk: "", proposal: "", pay: "", invoice: "" };
}

export function toolsReady(tools: ToolCookies | undefined): ToolReady {
  const t = tools || emptyTools();
  return {
    crm: Boolean(t.crm),
    desk: Boolean(t.desk),
    proposal: Boolean(t.proposal),
    pay: Boolean(t.pay),
    invoice: Boolean(t.invoice),
  };
}

export function parseCookies(request: Request): Record<string, string> {
  const raw = request.headers.get("Cookie") || "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

const APP_ZONE = "cbshippingsolutions.app";

/** Share the session across floor. / go. / yard. / theyard. Never set Domain on workers.dev. */
export function sessionCookieDomain(hostname: string): string | null {
  const host = String(hostname || "").toLowerCase();
  if (host === APP_ZONE || host.endsWith("." + APP_ZONE)) return "." + APP_ZONE;
  return null;
}

function cookieHeader(request: Request, token: string, maxAge: number): string[] {
  const url = new URL(request.url);
  const parts = [
    `${COOKIE}=${token ? encodeURIComponent(token) : ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (url.protocol === "https:") parts.push("Secure");
  const domain = sessionCookieDomain(url.hostname);
  if (domain && url.protocol === "https:") parts.push("Domain=" + domain);
  return [parts.join("; ")];
}

function sessionKey(sid: string): string {
  return "os:" + sid;
}

export async function readSession(request: Request, env: Env): Promise<SessionUser | null> {
  const secret = env.AUTH_SECRET;
  if (!secret) return null;
  const token = parseCookies(request)[COOKIE];
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = await sign(payloadB64, secret);
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const json = new TextDecoder().decode(b64urlDecode(payloadB64));
    const data = JSON.parse(json) as { e?: string; n?: string; x?: number; k?: string; sid?: string; t?: ToolCookies };
    if (data.k !== "os" || !data.e || !isCompanyEmail(data.e) || !data.x || data.x < Date.now()) return null;
    if (data.sid && env.SESSIONS) {
      const raw = await env.SESSIONS.get(sessionKey(data.sid));
      if (!raw) return null;
      const stored = JSON.parse(raw) as SessionUser;
      if (!stored?.email || !isCompanyEmail(stored.email)) return null;
      return {
        email: stored.email,
        name: stored.name || stored.email,
        tools: stored.tools || emptyTools(),
      };
    }
    return {
      email: data.e,
      name: data.n || data.e,
      tools: data.t || emptyTools(),
    };
  } catch {
    return null;
  }
}

export async function makeSession(request: Request, env: Env, user: SessionUser): Promise<string[]> {
  const secret = env.AUTH_SECRET || "";
  const sid = randomId();
  if (env.SESSIONS) {
    await env.SESSIONS.put(sessionKey(sid), JSON.stringify(user), { expirationTtl: MAX_AGE });
  }
  const payload = JSON.stringify({
    k: "os",
    e: user.email,
    n: user.name,
    x: Date.now() + MAX_AGE * 1000,
    sid: env.SESSIONS ? sid : undefined,
    t: env.SESSIONS ? undefined : user.tools,
  });
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payload));
  const token = payloadB64 + "." + (await sign(payloadB64, secret));
  return cookieHeader(request, token, MAX_AGE);
}

export async function clearSession(request: Request, env?: Env): Promise<string[]> {
  if (env?.AUTH_SECRET && env.SESSIONS) {
    const userCookie = parseCookies(request)[COOKIE];
    const payloadB64 = userCookie ? userCookie.split(".")[0] : "";
    if (payloadB64) {
      try {
        const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))) as { sid?: string };
        if (data.sid) await env.SESSIONS.delete(sessionKey(data.sid));
      } catch {
        /* ignore */
      }
    }
  }
  return cookieHeader(request, "", 0);
}

function cookieFromSetCookie(headers: Headers, names: string[]): string {
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const list = raw.length ? raw : String(headers.get("set-cookie") || "").split(/,(?=[^;]+=)/);
  const found: string[] = [];
  for (const name of names) {
    for (const line of list) {
      const piece = String(line || "").split(";")[0].trim();
      if (piece.toLowerCase().startsWith(name.toLowerCase() + "=")) found.push(piece);
    }
  }
  return found.join("; ");
}

async function loginOrigin(
  origin: string,
  email: string,
  password: string,
  fetcher?: Fetcher,
): Promise<{ ok: boolean; status: number; cookie: string; name: string; error?: string }> {
  const req = new Request(origin + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA, Origin: origin },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  });
  let res: Response;
  try {
    res = fetcher ? await fetcher.fetch(req) : await fetch(req);
  } catch {
    return { ok: false, status: 504, cookie: "", name: "", error: "That tool did not answer. Try again." };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const nested = (body.user && typeof body.user === "object" ? body.user : {}) as { email?: string; name?: string };
  const name = String(nested.name || body.name || email);
  const cookie = cookieFromSetCookie(res.headers, [
    "cbss_session",
    "cbss_brain",
    "cbss_pay",
    "cbss_invoice",
  ]);
  if (!res.ok || body.ok === false) {
    return { ok: false, status: res.status, cookie: "", name: "", error: String(body.error || "Could not sign in.") };
  }
  if (!cookie) {
    return { ok: false, status: 502, cookie: "", name: "", error: "That tool signed in but did not return a session cookie." };
  }
  return { ok: true, status: res.status, cookie, name };
}

export async function loginAllTools(
  env: Env,
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number; error: string }> {
  const o = origins(env);
  const crm = await loginOrigin(o.crm, email, password, env.CRM);
  if (!crm.ok) return { ok: false, status: crm.status || 401, error: crm.error || "Use your company email and CRM password." };
  const [desk, proposal, pay, invoice] = await Promise.all([
    loginOrigin(o.desk, email, password, env.DESK),
    loginOrigin(o.proposal, email, password, env.PROPOSAL),
    loginOrigin(o.pay, email, password, env.PAY),
    loginOrigin(o.invoice, email, password, env.INVOICE),
  ]);
  return {
    ok: true,
    user: {
      email,
      name: crm.name,
      tools: {
        crm: crm.cookie,
        desk: desk.cookie,
        proposal: proposal.cookie,
        pay: pay.cookie,
        invoice: invoice.cookie,
      },
    },
  };
}

export { UA, COOKIE };
