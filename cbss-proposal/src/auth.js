const COMPANY_RE = /@cbshippingsolutions\.com$/i;
const COOKIE_NAME = "cbss_session";
const AUTH_USERS_KEY = "auth:users";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;
const HOP_TTL_MS = 120 * 1000;
const PREFILL_KEYS = ["name", "company", "email", "phone", "zip"];
const ALLOWED_HOST_RE = /(^|\.)(cbsscrm|cbsscompletetool|cbssbrain)\.(pages|workers)\.dev$/i;

function ownerEmail() {
  return ["christopher", "cbshippingsolutions.com"].join("@");
}

export function isCompanyEmail(email) {
  return COMPANY_RE.test(String(email || "").trim());
}

function header(request, name) {
  return request.headers.get(name) || "";
}

function allowOrigin(request) {
  const origin = header(request, "Origin");
  if (!origin) return "";
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return origin;
    if (ALLOWED_HOST_RE.test(host)) return origin;
  } catch (_) {}
  return "";
}

function corsHeaders(request) {
  const origin = allowOrigin(request);
  const h = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ingest-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  if (origin) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function applyExtraHeaders(headers, extra) {
  if (!extra) return;
  Object.entries(extra).forEach(([k, v]) => {
    if (k.toLowerCase() === "set-cookie") {
      (Array.isArray(v) ? v : [v]).forEach((c) => {
        if (c) headers.append("Set-Cookie", c);
      });
    } else if (v != null) {
      headers.set(k, v);
    }
  });
}

export function jsonResponse(request, status, body, extraHeaders) {
  const headers = new Headers();
  Object.entries(corsHeaders(request)).forEach(([k, v]) => {
    if (v != null) headers.set(k, v);
  });
  applyExtraHeaders(headers, extraHeaders);
  return new Response(JSON.stringify(body), { status, headers });
}

export function optionsResponse(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function b64urlEncode(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - str.length % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function textEncode(s) {
  return new TextEncoder().encode(s);
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", textEncode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signPayload(payloadB64, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, textEncode(payloadB64));
  return b64urlEncode(sig);
}

function timingSafeEqualStr(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (!aa || aa.length !== bb.length) return false;
  let x = 0;
  for (let i = 0; i < aa.length; i++) x |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return x === 0;
}

function parseCookies(request) {
  const raw = header(request, "Cookie");
  const out = {};
  if (!raw) return out;
  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch (_) {
      out[k] = v;
    }
  });
  return out;
}

function parentCookieDomain(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (h.endsWith(".cbss.workers.dev") && h !== "cbss.workers.dev") return ".cbss.workers.dev";
  return "";
}

function cookieStrings(request, token, maxAge) {
  const url = new URL(request.url);
  const parts = [
    COOKIE_NAME + "=" + (token ? encodeURIComponent(token) : ""),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + maxAge,
  ];
  if (url.protocol === "https:") parts.push("Secure");
  const out = [parts.join("; ")];
  const domain = parentCookieDomain(url.hostname);
  if (domain) out.push(parts.concat(["Domain=" + domain]).join("; "));
  return out;
}

export async function readSession(request, env) {
  const secret = env.AUTH_SECRET || "";
  if (!secret) return null;
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expect = await signPayload(payloadB64, secret);
  if (!timingSafeEqualStr(sig, expect)) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch (_) {
    return null;
  }
  if (!payload || !payload.e || !isCompanyEmail(payload.e)) return null;
  if (payload.k && payload.k !== "sess") return null;
  if (payload.x && Date.now() > Number(payload.x)) return null;
  return {
    email: String(payload.e).trim().toLowerCase(),
    name: payload.n || payload.e,
    user_metadata: { full_name: payload.n || payload.e },
  };
}

async function makeSessionCookie(request, env, email, name) {
  const now = Date.now();
  const payload = {
    e: String(email).trim().toLowerCase(),
    n: name || email,
    t: now,
    x: now + MAX_AGE_SEC * 1000,
    k: "sess",
  };
  const payloadB64 = b64urlEncode(textEncode(JSON.stringify(payload)));
  const sig = await signPayload(payloadB64, env.AUTH_SECRET);
  return cookieStrings(request, payloadB64 + "." + sig, MAX_AGE_SEC);
}

function clearSessionCookie(request) {
  return cookieStrings(request, "", 0);
}

async function makeHopToken(env, email, name) {
  const now = Date.now();
  const nonce = b64urlEncode(crypto.getRandomValues(new Uint8Array(12)));
  const payload = {
    e: String(email).trim().toLowerCase(),
    n: name || email,
    t: now,
    x: now + HOP_TTL_MS,
    k: "hop",
    j: nonce,
  };
  const payloadB64 = b64urlEncode(textEncode(JSON.stringify(payload)));
  const sig = await signPayload(payloadB64, env.AUTH_SECRET);
  return payloadB64 + "." + sig;
}

async function consumeHopToken(env, token) {
  const secret = env.AUTH_SECRET || "";
  if (!secret || !token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!timingSafeEqualStr(sig, await signPayload(payloadB64, secret))) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch (_) {
    return null;
  }
  if (!payload || payload.k !== "hop" || !payload.e || !isCompanyEmail(payload.e)) return null;
  if (!payload.x || Date.now() > Number(payload.x)) return null;
  if (env.CRM_STORE && payload.j) {
    const usedKey = "auth:hopused:" + payload.j;
    if (await env.CRM_STORE.get(usedKey)) return null;
    await env.CRM_STORE.put(usedKey, "1", { expirationTtl: 180 });
  }
  return { email: String(payload.e).trim().toLowerCase(), name: payload.n || payload.e };
}

function copyPrefill(fromUrl, destUrl) {
  PREFILL_KEYS.forEach((k) => {
    const v = fromUrl.searchParams.get(k);
    if (v) destUrl.searchParams.set(k, v);
  });
}

export async function handleHopIssue(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  const token = await makeHopToken(env, user.email, user.name);
  return jsonResponse(request, 200, { ok: true, token, expiresIn: 120 });
}

export async function handleHopConsume(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET") return jsonResponse(request, 405, { error: "Method not allowed" });
  const url = new URL(request.url);
  const dest = new URL("/", url.origin);
  copyPrefill(url, dest);
  const loc = dest.pathname + dest.search;
  const user = await consumeHopToken(env, url.searchParams.get("t") || url.searchParams.get("hop") || "");
  if (!user) return new Response(null, { status: 302, headers: { Location: loc } });
  const cookies = await makeSessionCookie(request, env, user.email, user.name);
  const headers = new Headers({ Location: loc });
  cookies.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(h) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hashPassword(password, saltBytes, iter) {
  const key = await crypto.subtle.importKey("raw", textEncode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter },
    key,
    256,
  );
  return hex(bits);
}

async function loadUsers(env) {
  const raw = await env.CRM_STORE.get(AUTH_USERS_KEY, { type: "json" });
  return raw && typeof raw === "object" ? raw : {};
}

async function saveUsers(env, users) {
  await env.CRM_STORE.put(AUTH_USERS_KEY, JSON.stringify(users));
}

async function loginWithPassword(env, email, password) {
  const e = String(email || "").trim().toLowerCase();
  if (!isCompanyEmail(e)) return { error: "Company email required (@cbshippingsolutions.com).", status: 403 };
  if (!password) return { error: "Password required.", status: 400 };
  const users = await loadUsers(env);
  const rec = users[e];
  const displayName = e === ownerEmail() ? "Christopher Banks" : e.split("@")[0];
  if (!rec) {
    const salt2 = crypto.getRandomValues(new Uint8Array(16));
    const iter2 = 100000;
    users[e] = {
      salt: hex(salt2),
      hash: await hashPassword(password, salt2, iter2),
      iter: iter2,
      name: displayName,
      setAt: new Date().toISOString(),
    };
    await saveUsers(env, users);
    return { email: e, name: displayName, firstSet: true };
  }
  const hash = await hashPassword(password, fromHex(rec.salt), rec.iter || 100000);
  if (!timingSafeEqualStr(hash, rec.hash)) return { error: "Invalid email or password.", status: 401 };
  return { email: e, name: rec.name || displayName, firstSet: false };
}

export async function handleLogin(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "Method not allowed" });
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(request, 400, { error: "Invalid JSON" });
  }
  const result = await loginWithPassword(env, body.email, body.password);
  if (result.error) return jsonResponse(request, result.status || 401, { error: result.error });
  const cookie = await makeSessionCookie(request, env, result.email, result.name);
  return jsonResponse(request, 200, {
    ok: true,
    email: result.email,
    name: result.name,
    firstSet: Boolean(result.firstSet),
  }, { "Set-Cookie": cookie });
}

export async function handleMe(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET" && request.method !== "POST") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  return jsonResponse(request, 200, { email: user.email, name: user.name });
}

export async function handleLogout(request) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST" && request.method !== "GET") return jsonResponse(request, 405, { error: "Method not allowed" });
  return jsonResponse(request, 200, { ok: true }, { "Set-Cookie": clearSessionCookie(request) });
}

export function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}
