const COOKIE = "cbss_pay";
const MAX_AGE = 60 * 60 * 24 * 30;
const COMPANY_RE = /@cbshippingsolutions\.com$/i;
const CRM_LOGIN = "https://cbsscrm.cbss.workers.dev/auth/login";

export type SessionUser = { email: string; name: string; crm?: string };

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

export function isCompanyEmail(email: string): boolean {
  return COMPANY_RE.test(String(email || "").trim());
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
  const out = [parts.join("; ")];
  const host = url.hostname.toLowerCase();
  if (host.endsWith(".cbss.workers.dev") && host !== "cbss.workers.dev") {
    out.push([...parts, "Domain=.cbss.workers.dev"].join("; "));
  }
  return out;
}

function crmTokenFromLogin(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const fallback = res.headers.get("set-cookie");
  const cookies = raw.length ? raw : fallback ? [fallback] : [];
  for (const cookie of cookies) {
    const match = String(cookie).match(/cbss_session=([^;]+)/);
    if (match && match[1]) return match[1];
  }
  return "";
}

export async function loginViaCrm(
  env: Env,
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string; status: number }> {
  const clean = String(email || "").trim().toLowerCase();
  if (!isCompanyEmail(clean)) {
    return { ok: false, error: "Use your company email.", status: 401 };
  }
  try {
    const req = new Request(CRM_LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://cbsscrm.cbss.workers.dev",
        Referer: "https://cbsscrm.cbss.workers.dev/",
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ email: clean, password }),
    });
    const res = env.CRM ? await env.CRM.fetch(req) : await fetch(req);
    const rawText = await res.text();
    let data: { ok?: boolean; email?: string; name?: string; error?: string } = {};
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      data = {};
    }
    if (!res.ok || !data.ok) {
      if (res.status >= 500 || res.status === 403) {
        return { ok: false, error: "Could not reach the CRM login. Try again.", status: 502 };
      }
      return { ok: false, error: data.error || "Wrong email or password.", status: 401 };
    }
    const crm = crmTokenFromLogin(res);
    return {
      ok: true,
      user: {
        email: String(data.email || clean).toLowerCase(),
        name: String(data.name || clean.split("@")[0]),
        crm,
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the CRM login. Try again.", status: 502 };
  }
}

export async function makeSession(request: Request, env: Env, user: SessionUser): Promise<string[]> {
  const payload = JSON.stringify({
    k: "pay",
    e: user.email,
    n: user.name,
    x: Date.now() + MAX_AGE * 1000,
    crm: user.crm || "",
  });
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payload));
  const sig = await sign(payloadB64, env.AUTH_SECRET || "");
  return cookieHeader(request, `${payloadB64}.${sig}`, MAX_AGE);
}

export function clearSession(request: Request): string[] {
  return cookieHeader(request, "", 0);
}

export async function readSession(request: Request, env: Env): Promise<SessionUser | null> {
  const secret = env.AUTH_SECRET || "";
  if (!secret) return null;
  const token = parseCookies(request)[COOKIE];
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expect = await sign(payloadB64, secret);
  if (!timingSafeEqualStr(sig, expect)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (!payload || payload.k !== "pay" || !payload.e) return null;
    if (payload.x && Date.now() > Number(payload.x)) return null;
    return { email: String(payload.e), name: String(payload.n || payload.e), crm: String(payload.crm || "") };
  } catch {
    return null;
  }
}
