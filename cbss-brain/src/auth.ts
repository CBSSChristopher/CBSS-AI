const COOKIE = "cbss_brain";
const MAX_AGE = 60 * 60 * 24 * 30;

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

export async function checkPassword(env: Env, password: string): Promise<boolean> {
  const expected = env.TEAM_PASSWORD || "";
  return Boolean(expected) && timingSafeEqualStr(String(password || ""), expected);
}

export async function makeSession(request: Request, env: Env): Promise<string[]> {
  const payload = JSON.stringify({ k: "brain", x: Date.now() + MAX_AGE * 1000 });
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payload));
  const sig = await sign(payloadB64, env.AUTH_SECRET);
  return cookieHeader(request, `${payloadB64}.${sig}`, MAX_AGE);
}

export function clearSession(request: Request): string[] {
  return cookieHeader(request, "", 0);
}

export async function readSession(request: Request, env: Env): Promise<boolean> {
  const secret = env.AUTH_SECRET || "";
  if (!secret) return false;
  const token = parseCookies(request)[COOKIE];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expect = await sign(payloadB64, secret);
  if (!timingSafeEqualStr(sig, expect)) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (!payload || payload.k !== "brain") return false;
    if (payload.x && Date.now() > Number(payload.x)) return false;
    return true;
  } catch {
    return false;
  }
}
