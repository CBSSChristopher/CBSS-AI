import { applyFollowupPatch, clearFollowupEdits, completeFollowupKeys, completedActionText, completionNote, mergeNoteOntoContact } from "./followups.js";

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/auth.js
var COMPANY_RE = /@cbshippingsolutions\.com$/i;
var COOKIE_NAME = "cbss_session";
function isSeedOwnerEmail(email) {
  return String(email || "").trim().toLowerCase().split("@")[0] === "christopher";
}
var AUTH_USERS_KEY = "auth:users";
var MAX_AGE_SEC = 60 * 60 * 24 * 30;
var HOP_TTL_MS = 120 * 1e3;
var PREFILL_KEYS = ["name", "company", "email", "phone", "zip"];
var ALLOWED_HOST_RE = /(^|\.)(cbsscrm|cbsscompletetool)\.(pages|workers)\.dev$/i;
function isCompanyEmail(email) {
  return COMPANY_RE.test(String(email || "").trim());
}
__name(isCompanyEmail, "isCompanyEmail");
function header(request, name) {
  return request.headers.get(name) || "";
}
__name(header, "header");
function allowOrigin(request) {
  const origin = header(request, "Origin");
  if (!origin) return "";
  try {
    const u = new URL(origin);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1") return origin;
    if (ALLOWED_HOST_RE.test(host)) return origin;
  } catch (_) {
  }
  return "";
}
__name(allowOrigin, "allowOrigin");
function corsHeaders(request, extra) {
  const origin = allowOrigin(request);
  const h = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ingest-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
    Vary: "Origin"
  };
  if (origin) h["Access-Control-Allow-Origin"] = origin;
  return extra ? { ...h, ...extra } : h;
}
__name(corsHeaders, "corsHeaders");
function applyExtraHeaders(headers, extra) {
  if (!extra) return;
  Object.entries(extra).forEach(([k, v]) => {
    if (k.toLowerCase() === "set-cookie") {
      const list = Array.isArray(v) ? v : [v];
      list.forEach((c) => {
        if (c) headers.append("Set-Cookie", c);
      });
    } else if (v != null) {
      headers.set(k, v);
    }
  });
}
__name(applyExtraHeaders, "applyExtraHeaders");
function jsonResponse(request, status, body, extraHeaders) {
  const headers = new Headers();
  const cors = corsHeaders(request);
  Object.entries(cors).forEach(([k, v]) => {
    if (k.toLowerCase() === "set-cookie") return;
    if (v != null) headers.set(k, v);
  });
  applyExtraHeaders(headers, extraHeaders);
  return new Response(JSON.stringify(body), { status, headers });
}
__name(jsonResponse, "jsonResponse");
function optionsResponse(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
__name(optionsResponse, "optionsResponse");
function b64urlEncode(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(b64urlEncode, "b64urlEncode");
function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - str.length % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64urlDecode, "b64urlDecode");
function textEncode(s) {
  return new TextEncoder().encode(s);
}
__name(textEncode, "textEncode");
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    textEncode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(hmacKey, "hmacKey");
async function signPayload(payloadB64, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, textEncode(payloadB64));
  return b64urlEncode(sig);
}
__name(signPayload, "signPayload");
function timingSafeEqualStr(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (!aa || aa.length !== bb.length) return false;
  let x = 0;
  for (let i = 0; i < aa.length; i++) x |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return x === 0;
}
__name(timingSafeEqualStr, "timingSafeEqualStr");
function isIngestAuthorized(request, env) {
  const secret = env.CRM_INGEST_SECRET || "";
  const provided = header(request, "x-ingest-secret");
  return Boolean(secret) && timingSafeEqualStr(provided, secret);
}
__name(isIngestAuthorized, "isIngestAuthorized");
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
__name(parseCookies, "parseCookies");
function parentCookieDomain(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (h.endsWith(".cbss.workers.dev") && h !== "cbss.workers.dev") {
    return ".cbss.workers.dev";
  }
  return "";
}
__name(parentCookieDomain, "parentCookieDomain");
function cookieBaseParts(request, token, maxAge) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const parts = [
    COOKIE_NAME + "=" + (token ? encodeURIComponent(token) : ""),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + maxAge
  ];
  if (secure) parts.push("Secure");
  return { parts, hostname: url.hostname };
}
__name(cookieBaseParts, "cookieBaseParts");
function cookieStrings(request, token, maxAge) {
  const { parts, hostname } = cookieBaseParts(request, token, maxAge);
  const out = [parts.join("; ")];
  const domain = parentCookieDomain(hostname);
  if (domain) out.push(parts.concat(["Domain=" + domain]).join("; "));
  return out;
}
__name(cookieStrings, "cookieStrings");
async function readSession(request, env) {
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
    user_metadata: { full_name: payload.n || payload.e }
  };
}
__name(readSession, "readSession");
async function requireSession(request, env) {
  if (isIngestAuthorized(request, env)) {
    return { email: "ingest@cbshippingsolutions.com", ingest: true };
  }
  return readSession(request, env);
}
__name(requireSession, "requireSession");
async function makeSessionCookie(request, env, email, name) {
  const secret = env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET missing");
  const now = Date.now();
  const payload = {
    e: String(email).trim().toLowerCase(),
    n: name || email,
    t: now,
    x: now + MAX_AGE_SEC * 1e3,
    k: "sess"
  };
  const payloadB64 = b64urlEncode(textEncode(JSON.stringify(payload)));
  const sig = await signPayload(payloadB64, secret);
  const token = payloadB64 + "." + sig;
  return cookieStrings(request, token, MAX_AGE_SEC);
}
__name(makeSessionCookie, "makeSessionCookie");
function clearSessionCookie(request) {
  return cookieStrings(request, "", 0);
}
__name(clearSessionCookie, "clearSessionCookie");
async function makeHopToken(env, email, name) {
  const secret = env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET missing");
  const now = Date.now();
  const nonce = b64urlEncode(crypto.getRandomValues(new Uint8Array(12)));
  const payload = {
    e: String(email).trim().toLowerCase(),
    n: name || email,
    t: now,
    x: now + HOP_TTL_MS,
    k: "hop",
    j: nonce
  };
  const payloadB64 = b64urlEncode(textEncode(JSON.stringify(payload)));
  const sig = await signPayload(payloadB64, secret);
  return payloadB64 + "." + sig;
}
__name(makeHopToken, "makeHopToken");
async function consumeHopToken(env, token) {
  const secret = env.AUTH_SECRET || "";
  if (!secret || !token) return null;
  const parts = String(token).split(".");
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
  if (!payload || payload.k !== "hop" || !payload.e || !isCompanyEmail(payload.e)) return null;
  if (!payload.x || Date.now() > Number(payload.x)) return null;
  if (env.CRM_STORE && payload.j) {
    const usedKey = "auth:hopused:" + payload.j;
    const used = await env.CRM_STORE.get(usedKey);
    if (used) return null;
    await env.CRM_STORE.put(usedKey, "1", { expirationTtl: 180 });
  }
  return {
    email: String(payload.e).trim().toLowerCase(),
    name: payload.n || payload.e
  };
}
__name(consumeHopToken, "consumeHopToken");
function copyPrefill(fromUrl, destUrl) {
  PREFILL_KEYS.forEach((k) => {
    const v = fromUrl.searchParams.get(k);
    if (v) destUrl.searchParams.set(k, v);
  });
}
__name(copyPrefill, "copyPrefill");
async function handleHopIssue(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  const token = await makeHopToken(env, user.email, user.name);
  return jsonResponse(request, 200, { ok: true, token, expiresIn: 120 });
}
__name(handleHopIssue, "handleHopIssue");
async function handleHopConsume(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET") return jsonResponse(request, 405, { error: "Method not allowed" });
  const url = new URL(request.url);
  const token = url.searchParams.get("t") || url.searchParams.get("hop") || "";
  const dest = new URL("/", url.origin);
  copyPrefill(url, dest);
  const loc = dest.pathname + dest.search;
  const user = await consumeHopToken(env, token);
  if (!user) {
    return new Response(null, { status: 302, headers: { Location: loc } });
  }
  const cookies = await makeSessionCookie(request, env, user.email, user.name);
  const headers = new Headers({ Location: loc });
  (Array.isArray(cookies) ? cookies : [cookies]).forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
}
__name(handleHopConsume, "handleHopConsume");
function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hex, "hex");
function fromHex(h) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
__name(fromHex, "fromHex");
async function hashPassword(password, saltBytes, iter) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter },
    key,
    256
  );
  return hex(bits);
}
__name(hashPassword, "hashPassword");
async function loadUsers(env) {
  const raw = await env.CRM_STORE.get(AUTH_USERS_KEY, { type: "json" });
  return raw && typeof raw === "object" ? raw : {};
}
__name(loadUsers, "loadUsers");
async function saveUsers(env, users) {
  await env.CRM_STORE.put(AUTH_USERS_KEY, JSON.stringify(users));
}
__name(saveUsers, "saveUsers");
async function loginWithPassword(env, email, password) {
  const e = String(email || "").trim().toLowerCase();
  if (!isCompanyEmail(e)) {
    return { error: "Company email required (@cbshippingsolutions.com).", status: 403 };
  }
  if (!password || String(password).length < 1) {
    return { error: "Password required.", status: 400 };
  }
  const users = await loadUsers(env);
  const rec = users[e];
  const displayName = isSeedOwnerEmail(e) ? "Christopher Banks" : e.split("@")[0];
  if (!rec) {
    const salt2 = crypto.getRandomValues(new Uint8Array(16));
    const iter2 = 1e5;
    const hash2 = await hashPassword(password, salt2, iter2);
    users[e] = {
      salt: hex(salt2),
      hash: hash2,
      iter: iter2,
      name: displayName,
      setAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveUsers(env, users);
    return { email: e, name: displayName, firstSet: true };
  }
  const salt = fromHex(rec.salt);
  const iter = rec.iter || 1e5;
  const hash = await hashPassword(password, salt, iter);
  if (!timingSafeEqualStr(hash, rec.hash)) {
    return { error: "Invalid email or password.", status: 401 };
  }
  return { email: e, name: rec.name || displayName, firstSet: false };
}
__name(loginWithPassword, "loginWithPassword");
async function handleLogin(request, env) {
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
    firstSet: Boolean(result.firstSet)
  }, { "Set-Cookie": cookie });
}
__name(handleLogin, "handleLogin");
async function handleMe(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(request, 405, { error: "Method not allowed" });
  }
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  return jsonResponse(request, 200, { email: user.email, name: user.name });
}
__name(handleMe, "handleMe");
async function handleLogout(request) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST" && request.method !== "GET") {
    return jsonResponse(request, 405, { error: "Method not allowed" });
  }
  return jsonResponse(request, 200, { ok: true }, { "Set-Cookie": clearSessionCookie(request) });
}
__name(handleLogout, "handleLogout");
function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}
__name(normalizePath, "normalizePath");
async function serveAssets(request, env) {
  if (env.ASSETS) return env.ASSETS.fetch(request);
  return new Response("Not found", { status: 404 });
}
__name(serveAssets, "serveAssets");

// src/crm-data.js
function openStore(env) {
  const kv = env.CRM_STORE;
  if (!kv) {
    const err = new Error("CRM_STORE KV binding is not configured");
    err.code = "KV_NOT_CONFIGURED";
    throw err;
  }
  return {
    async get(key, opts) {
      if (opts && opts.type === "json") {
        try {
          return await kv.get(key, { type: "json" });
        } catch (_) {
          return null;
        }
      }
      return kv.get(key);
    },
    async setJSON(key, value) {
      await kv.put(key, JSON.stringify(value));
    }
  };
}
__name(openStore, "openStore");
async function loadArchive(store) {
  const archive = await store.get("contacts-archive", { type: "json" });
  return Array.isArray(archive) ? archive : [];
}
__name(loadArchive, "loadArchive");
function normEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return "";
  if (e.startsWith("dnc")) return "";
  return e;
}
__name(normEmail, "normEmail");
function normPhone(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length < 10) return "";
  return d;
}
__name(normPhone, "normPhone");
function nextId(existing) {
  const nums = existing.map((c) => Number(c && c.id)).filter((n) => Number.isFinite(n));
  const base = nums.length ? Math.max(...nums) : 9e5;
  return Math.max(base + 1, Date.now());
}
__name(nextId, "nextId");
function normName(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}
__name(normName, "normName");
function findMatch(pools, email, phone, name, company) {
  const em = normEmail(email);
  const ph = normPhone(phone);
  const nm = normName(name);
  const co = normName(company);
  for (const list of pools) {
    for (const row of list || []) {
      if (em && normEmail(row.email) && normEmail(row.email) === em) return row;
      if (ph && normPhone(row.phone) && normPhone(row.phone) === ph) return row;
    }
  }
  if (nm && !em && !ph) {
    for (const list of pools) {
      for (const row of list || []) {
        if (normName(row.name || row.contactName) === nm && normName(row.company || row.accountName) === co) return row;
      }
    }
  }
  return null;
}
__name(findMatch, "findMatch");
function inferStage(notes) {
  const n = String(notes || "").toLowerCase();
  if (/already bought|already purchased|bought local|bought containers|no longer need|can'?t afford|cannot afford|bad number|number no longer in service/.test(
    n
  )) {
    return "Lost";
  }
  if (/\bproposal\b/.test(n)) return "Proposal Sent";
  if (/\blvm\b|\bna\b|sent email|sending email/.test(n)) return "Contacted";
  return "Quote";
}
__name(inferStage, "inferStage");
function notesSayDnc(notes, email, phone) {
  return /\bdnc\b/i.test(`${notes || ""} ${email || ""} ${phone || ""}`);
}
__name(notesSayDnc, "notesSayDnc");
function emptyIfNone(v) {
  const s = String(v == null ? "" : v).trim();
  if (!s || /^(none|n\/a|na|null)$/i.test(s)) return "";
  return s;
}
__name(emptyIfNone, "emptyIfNone");
function realCompany(v) {
  const s = emptyIfNone(v);
  if (!s) return "";
  if (/^(residential|commercial)$/i.test(s)) return "";
  return s;
}
__name(realCompany, "realCompany");
var CANONICAL_STAGES = ["New Lead", "Contacted", "Quote", "Proposal Sent", "Flex Buy", "Won", "Lost", "DNC"];
var STAGE_ALIASES = {
  connected: "Contacted",
  connecting: "Contacted",
  "attempted to contact": "Contacted",
  attempted: "Contacted",
  quoted: "Quote",
  new: "New Lead"
};
function mapStage(stage) {
  const s = String(stage || "").trim();
  if (!s) return "";
  if (CANONICAL_STAGES.includes(s)) return s;
  return STAGE_ALIASES[s.toLowerCase()] || s;
}
__name(mapStage, "mapStage");
function isQuoteFormSource(source, payload) {
  const s = [source, payload && payload.source, payload && payload.form].map((x) => String(x || "").toLowerCase()).join(" ");
  return /quote form|formspree|quote-form|quoteform/.test(s);
}
__name(isQuoteFormSource, "isQuoteFormSource");
function isSheetTitle(source) {
  return /^(contacts|leads|contact|manual)$/i.test(String(source || "").trim());
}
__name(isSheetTitle, "isSheetTitle");
function resolveSource(source, payload, existing) {
  if (isQuoteFormSource(source, payload)) return "Quote Form";
  const incoming = String(source || payload && payload.source || "").trim();
  if (incoming && !isSheetTitle(incoming)) return incoming;
  const cur = String(existing || "").trim();
  if (cur && !isSheetTitle(cur)) return cur;
  if (incoming && !isSheetTitle(incoming)) return incoming;
  return incoming || cur || "";
}
__name(resolveSource, "resolveSource");
function parseNoteTimestamp(text) {
  const s = String(text || "");
  if (!s) return "";
  let last = "";
  const iso = [...s.matchAll(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/g)];
  if (iso.length) {
    const m = iso[iso.length - 1];
    last = m[2] ? m[1] + " " + String(m[2]).slice(0, 5) : m[1];
  }
  const long = [...s.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
  if (long.length) {
    const m = long[long.length - 1];
    last = m[3] + "-" + String(m[1]).padStart(2, "0") + "-" + String(m[2]).padStart(2, "0");
  }
  const short = [...s.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{2})(?!\d)/g)];
  if (short.length && !long.length) {
    const m = short[short.length - 1];
    const yy = Number(m[3]);
    const year = yy >= 70 ? 1900 + yy : 2e3 + yy;
    last = year + "-" + String(m[1]).padStart(2, "0") + "-" + String(m[2]).padStart(2, "0");
  }
  return last;
}
__name(parseNoteTimestamp, "parseNoteTimestamp");
function isBlank(v) {
  return v == null || String(v).trim() === "";
}
__name(isBlank, "isBlank");
function fillEmpty(updates, current, key, value) {
  if (isBlank(value)) return;
  if (!isBlank(current && current[key])) return;
  updates[key] = value;
}
__name(fillEmpty, "fillEmpty");
function asAmount(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return "";
  const cleaned = s.replace(/[$,]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : "";
}
__name(asAmount, "asAmount");
function amountIsBlank(v) {
  const a = asAmount(v);
  return a === "" || a === 0;
}
__name(amountIsBlank, "amountIsBlank");
function nowStamp() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ");
}
__name(nowStamp, "nowStamp");
function upsertDeal(deals, contact, fields) {
  let deal = deals.find((d) => String(d.contactId) === String(contact.id));
  if (!deal) {
    deal = {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      contactId: contact.id,
      contactName: contact.name,
      name: (contact.name || "Contact") + " - Container",
      stage: mapStage(fields.stage || contact.status || "Quote"),
      created: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      owner: contact.owner || "",
      amount: "",
      container: "",
      depot: "",
      wholesale: "",
      payment: "",
      lastActivity: nowStamp()
    };
    deals.push(deal);
  }
  if (fields.stage) deal.stage = mapStage(fields.stage);
  if (fields.amount !== void 0 && fields.amount !== "" && amountIsBlank(deal.amount)) {
    deal.amount = fields.amount;
  }
  if (fields.container) deal.container = fields.container;
  if (fields.depot) deal.depot = fields.depot;
  if (fields.wholesale !== void 0 && fields.wholesale !== "") {
    deal.wholesale = fields.wholesale;
  }
  if (fields.payment) deal.payment = fields.payment;
  if (fields.name) deal.name = fields.name;
  deal.contactName = contact.name || deal.contactName;
  deal.owner = contact.owner || deal.owner;
  deal.updated = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  deal.lastActivity = nowStamp();
  return deal;
}
__name(upsertDeal, "upsertDeal");
function rewriteQuoted(obj) {
  if (!obj || typeof obj !== "object") return false;
  let changed = false;
  if (obj.stage) {
    const mapped = mapStage(obj.stage);
    if (mapped && mapped !== obj.stage && CANONICAL_STAGES.includes(mapped)) {
      obj.stage = mapped;
      changed = true;
    }
  }
  if (obj.status) {
    const mapped = mapStage(obj.status);
    if (mapped && mapped !== obj.status && CANONICAL_STAGES.includes(mapped)) {
      obj.status = mapped;
      changed = true;
    }
  }
  return changed;
}
__name(rewriteQuoted, "rewriteQuoted");
function titleCaseOwner(s) {
  const raw = String(s == null ? "" : s).trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (/^contact owner$/i.test(raw)) return "";
  return raw.split(" ").map((w) => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");
}
__name(titleCaseOwner, "titleCaseOwner");
function resolvedOwner(contact, edits) {
  const overlay = edits && (edits[contact.id] || edits[String(contact.id)]) || {};
  return overlay.owner !== void 0 ? overlay.owner : contact.owner || "";
}
__name(resolvedOwner, "resolvedOwner");
async function migrateOwners(store, state, archive) {
  const edits = state.contactEdits || {};
  let contactChanged = 0;
  let dealChanged = 0;
  let quoteFormFilled = 0;
  const pools = [].concat(Array.isArray(archive) ? archive : []).concat(Array.isArray(state.contactsAdded) ? state.contactsAdded : []);
  for (const c of pools) {
    if (!c) continue;
    const overlay = edits[c.id] || edits[String(c.id)] || {};
    const mergedSource = overlay.source !== void 0 ? overlay.source : c.source;
    const cur = resolvedOwner(c, edits);
    let next = titleCaseOwner(cur);
    if (!next && String(mergedSource || "") === "Quote Form") {
      next = "Christopher Banks";
      quoteFormFilled += 1;
    }
    if (String(cur) === next) continue;
    const key = edits[c.id] != null ? c.id : edits[String(c.id)] != null ? String(c.id) : c.id;
    const nextOverlay = edits[key] || {};
    nextOverlay.owner = next;
    edits[key] = nextOverlay;
    contactChanged += 1;
  }
  for (const d of state.deals || []) {
    if (!d) continue;
    const cur = d.owner || "";
    const next = titleCaseOwner(cur);
    if (String(cur) === next) continue;
    d.owner = next;
    dealChanged += 1;
  }
  state.contactEdits = edits;
  const writes = [];
  if (contactChanged) writes.push(store.setJSON("contactEdits", state.contactEdits));
  if (dealChanged) writes.push(store.setJSON("deals", state.deals));
  if (writes.length) await Promise.all(writes);
  return { contactChanged, dealChanged, quoteFormFilled };
}
__name(migrateOwners, "migrateOwners");
async function migrateQuoted(store, state) {
  let changed = false;
  for (const deal of state.deals || []) {
    if (rewriteQuoted(deal)) changed = true;
  }
  for (const c of state.contactsAdded || []) {
    if (rewriteQuoted(c)) changed = true;
  }
  const edits = state.contactEdits || {};
  for (const key of Object.keys(edits)) {
    if (rewriteQuoted(edits[key])) changed = true;
  }
  if (changed) {
    await Promise.all([
      store.setJSON("deals", state.deals),
      store.setJSON("contactsAdded", state.contactsAdded),
      store.setJSON("contactEdits", state.contactEdits)
    ]);
  }
  return changed;
}
__name(migrateQuoted, "migrateQuoted");
async function readState(store) {
  const keys = ["deals", "followups", "notes", "contactsAdded", "contactEdits", "proposals", "archiveRequests"];
  const results = await Promise.all(keys.map((k) => store.get(k, { type: "json" })));
  return {
    deals: Array.isArray(results[0]) ? results[0] : [],
    followups: results[1] && typeof results[1] === "object" ? results[1] : {},
    notes: results[2] && typeof results[2] === "object" ? results[2] : {},
    contactsAdded: Array.isArray(results[3]) ? results[3] : [],
    contactEdits: results[4] && typeof results[4] === "object" ? results[4] : {},
    proposals: results[5] && typeof results[5] === "object" ? results[5] : {},
    archiveRequests: results[6] && typeof results[6] === "object" && !Array.isArray(results[6]) ? results[6] : {}
  };
}
__name(readState, "readState");
function isChristopherUser(user) {
  const email = String(user && user.email || "").trim().toLowerCase();
  if (email && isSeedOwnerEmail(email)) return true;
  const name = String(user && user.name || "").trim();
  return /^christopher banks$/i.test(name);
}
__name(isChristopherUser, "isChristopherUser");
function applyApprovedArchives(state) {
  const reqs = state.archiveRequests && typeof state.archiveRequests === "object" ? state.archiveRequests : {};
  const edits = state.contactEdits && typeof state.contactEdits === "object" ? state.contactEdits : {};
  for (const key of Object.keys(reqs)) {
    const r = reqs[key];
    if (!r || String(r.status || "").toLowerCase() !== "approved") continue;
    const id = r.contactId != null && r.contactId !== "" ? r.contactId : key;
    const editKey = edits[id] != null ? id : edits[String(id)] != null ? String(id) : id;
    const overlay = Object.assign({}, edits[editKey] || {});
    overlay.archived = true;
    edits[editKey] = overlay;
  }
  state.contactEdits = edits;
}
__name(applyApprovedArchives, "applyApprovedArchives");
function preserveArchivedFlags(current, incoming) {
  const merged = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? Object.assign({}, incoming) : {};
  const prev = current && typeof current === "object" ? current : {};
  for (const key of Object.keys(prev)) {
    if (!prev[key] || prev[key].archived !== true) continue;
    merged[key] = Object.assign({}, merged[key] || {}, { archived: true });
    if (prev[String(key)] && key !== String(key) && prev[String(key)].archived === true) {
      merged[String(key)] = Object.assign({}, merged[String(key)] || {}, { archived: true });
    }
  }
  return merged;
}
__name(preserveArchivedFlags, "preserveArchivedFlags");
function applyEdits(contacts, edits) {
  const map = edits || {};
  contacts.forEach((c) => {
    if (map[c.id]) Object.assign(c, map[c.id]);
    else if (map[String(c.id)]) Object.assign(c, map[String(c.id)]);
  });
}
__name(applyEdits, "applyEdits");
function ingestOne(state, archive, payload, source) {
  const email = payload.email || payload.contactEmail || "";
  const phone = payload.phone || payload.contactPhone || "";
  const name = payload.name || payload.customerName || payload.contactName || "";
  const company = realCompany(payload.company || payload.accountName || "");
  const notesText = payload.notes || payload.note || "";
  const owner = payload.owner || payload.beingWorkedBy || payload.repName || payload.dealOwner || "";
  const match = findMatch(
    [
      state.contactsAdded,
      archive,
      state.deals.map((d) => ({
        id: d.contactId,
        email: d.email,
        phone: d.phone,
        name: d.contactName,
        company: d.company
      }))
    ],
    email,
    phone,
    name,
    company
  );
  let contact = match;
  let created = false;
  if (!contact) {
    contact = {
      id: nextId(state.contactsAdded.concat(archive)),
      name,
      company,
      email,
      phone,
      street: "",
      city: "",
      state: "",
      zip: payload.zip || "",
      owner,
      status: mapStage(payload.stage || payload.status || "New Lead"),
      created: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      source: resolveSource(source, payload, "") || (isQuoteFormSource(source, payload) ? "Quote Form" : source || payload.source || "Proposal Tool"),
      nextAction: "",
      followUpDate: "",
      notes: [],
      dnc: Boolean(payload.dnc),
      containerSize: payload.containerSize || "",
      condition: payload.condition || "",
      quantity: payload.quantity || "",
      depot: payload.depot || "",
      delivery: payload.delivery || "",
      amount: asAmount(payload.amount || payload.unitPrice),
      wholesale: asAmount(payload.wholesale || payload.wholesaleCost),
      paymentMode: payload.paymentMode || (payload.flexSelected ? "flex" : ""),
      clientType: payload.clientType || "",
      lastActivity: nowStamp()
    };
    if (notesText) {
      contact.notes.push({
        author: owner || "System",
        timestamp: parseNoteTimestamp(notesText) || nowStamp(),
        tag: source || "Import",
        text: notesText
      });
    }
    state.contactsAdded.unshift(contact);
    created = true;
  } else {
    const overlay = state.contactEdits[contact.id] || state.contactEdits[String(contact.id)] || {};
    const updates = {};
    fillEmpty(updates, contact, "name", name);
    fillEmpty(updates, contact, "company", company);
    fillEmpty(updates, contact, "owner", owner);
    fillEmpty(updates, contact, "zip", payload.zip);
    fillEmpty(updates, contact, "depot", payload.depot);
    fillEmpty(updates, contact, "delivery", payload.delivery);
    fillEmpty(updates, contact, "containerSize", payload.containerSize);
    fillEmpty(updates, contact, "condition", payload.condition);
    fillEmpty(updates, contact, "quantity", payload.quantity);
    fillEmpty(updates, contact, "clientType", payload.clientType);
    fillEmpty(updates, contact, "paymentMode", payload.paymentMode);
    const amt = asAmount(payload.amount || payload.unitPrice);
    if (amt !== "" && amountIsBlank(contact.amount) && amountIsBlank(overlay.amount)) {
      updates.amount = amt;
    }
    const wh = asAmount(payload.wholesale || payload.wholesaleCost);
    if (wh !== "" && isBlank(contact.wholesale) && isBlank(overlay.wholesale)) updates.wholesale = wh;
    if (payload.dnc) updates.dnc = true;
    const incomingSource = resolveSource(source, payload, contact.source);
    if (incomingSource && (isBlank(contact.source) || isSheetTitle(contact.source) || incomingSource === "Quote Form" && contact.source === "Manual")) {
      updates.source = incomingSource;
    }
    if (payload.stage) {
      const mapped = mapStage(payload.stage);
      if (mapped) updates.status = mapped;
    } else if (contact.status && mapStage(contact.status) !== contact.status) {
      updates.status = mapStage(contact.status);
    }
    const importish = incomingSource === "Drive Deals" || incomingSource === "Quote Form" || source === "Drive Deals" || source === "Quote Form";
    if (!importish) updates.lastActivity = nowStamp();
    Object.assign(overlay, updates);
    Object.assign(contact, overlay);
    state.contactEdits[contact.id] = overlay;
    if (notesText) {
      const note = {
        author: owner || "System",
        timestamp: parseNoteTimestamp(notesText) || nowStamp(),
        tag: source || "Import",
        text: notesText
      };
      state.notes[contact.id] = state.notes[contact.id] || [];
      const existingNote = (state.notes[contact.id] || []).find((n) => n.text === note.text);
      if (existingNote) {
        if (note.timestamp && existingNote.timestamp !== note.timestamp) existingNote.timestamp = note.timestamp;
      } else {
        state.notes[contact.id].unshift(note);
      }
    }
  }
  const deal = upsertDeal(state.deals, contact, {
    stage: mapStage(payload.stage || contact.status || "Quote"),
    amount: asAmount(payload.amount || payload.unitPrice),
    container: payload.containerDesc || payload.container || contact.containerSize || "",
    depot: payload.depot || contact.depot || "",
    wholesale: asAmount(payload.wholesale || payload.wholesaleCost),
    payment: payload.paymentMode || (payload.flexSelected ? "Flex Buy" : contact.paymentMode || ""),
    name: (contact.name || name || "Contact") + " - Container"
  });
  return { contact, deal, created };
}
__name(ingestOne, "ingestOne");
async function persistState(store, state) {
  await Promise.all([
    store.setJSON("deals", state.deals),
    store.setJSON("followups", state.followups),
    store.setJSON("notes", state.notes),
    store.setJSON("contactsAdded", state.contactsAdded),
    store.setJSON("contactEdits", state.contactEdits),
    store.setJSON("proposals", state.proposals)
  ]);
}
__name(persistState, "persistState");
async function handleCrmData(request, env) {
  try {
    const url = new URL(request.url);
    let body = {};
    if (request.method !== "GET") {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw);
    }
    const action = url.searchParams.get("action") || body.action || "get";
    const user = await requireSession(request, env);
    if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
    const store = openStore(env);
    if (action === "getNotes") {
      const notes = await store.get("notes", { type: "json" });
      return jsonResponse(request, 200, { notes: notes && typeof notes === "object" ? notes : {} });
    }
    if (action === "completeFollowup") {
      const contactId = String(body.contactId || body.id || "").trim();
      if (!contactId) return jsonResponse(request, 400, { error: "contactId required" });
      const current = await store.get("followups", { type: "json" });
      const merged = completeFollowupKeys(current && typeof current === "object" ? current : {}, contactId);
      const edits = clearFollowupEdits(await store.get("contactEdits", { type: "json" }), contactId);
      const actionText = completedActionText(body);
      const author = user && (user.name || user.email) || "User";
      const existingNotes = await store.get("notes", { type: "json" });
      const notes = mergeNoteOntoContact(existingNotes, contactId, completionNote(actionText, author, nowStamp()));
      await Promise.all([
        store.setJSON("followups", merged),
        store.setJSON("contactEdits", edits),
        store.setJSON("notes", notes)
      ]);
      return jsonResponse(request, 200, { ok: true, contactId, completed: true });
    }
    if (!await store.get("_init")) {
      await store.setJSON("_init", {
        created: (/* @__PURE__ */ new Date()).toISOString(),
        app: "cbss-crm"
      });
    }
    const archive = await loadArchive(store);
    const state = await readState(store);
    if (request.method === "GET" || action === "get") {
      applyApprovedArchives(state);
      applyEdits(archive, state.contactEdits);
      applyEdits(state.contactsAdded, state.contactEdits);
      const omitNotes = url.searchParams.get("omitNotes") === "1" || body.omitNotes === true || body.omitNotes === "1";
      const payload = {
        deals: state.deals,
        followups: state.followups,
        contactsAdded: state.contactsAdded,
        contactEdits: state.contactEdits,
        proposals: state.proposals,
        archiveRequests: state.archiveRequests,
        contacts: archive
      };
      if (!omitNotes) payload.notes = state.notes;
      return jsonResponse(request, 200, payload);
    }
    if (action === "saveFollowups") {
      const incoming = body.followups && typeof body.followups === "object" && !Array.isArray(body.followups) ? body.followups : {};
      const current = state.followups && typeof state.followups === "object" ? state.followups : {};
      const incomingKeys = Object.keys(incoming);
      if (!incomingKeys.length) {
        return jsonResponse(request, 200, { ok: true, merged: true, keys: Object.keys(current).length });
      }
      const merged = applyFollowupPatch(current, incoming);
      await store.setJSON("followups", merged);
      return jsonResponse(request, 200, { ok: true, merged: true, keys: Object.keys(merged).length });
    }
    if (action === "saveArchiveRequests") {
      const incoming = body.archiveRequests && typeof body.archiveRequests === "object" && !Array.isArray(body.archiveRequests) ? body.archiveRequests : {};
      const current = state.archiveRequests && typeof state.archiveRequests === "object" ? state.archiveRequests : {};
      const incomingKeys = Object.keys(incoming);
      if (!incomingKeys.length) {
        return jsonResponse(request, 200, { ok: true, merged: true, keys: Object.keys(current).length });
      }
      const merged = Object.assign({}, current);
      const edits = state.contactEdits && typeof state.contactEdits === "object" ? Object.assign({}, state.contactEdits) : {};
      let editsChanged = false;
      const reviewer = isChristopherUser(user);
      const actorName = user && (user.name || user.email) || "";
      for (const key of incomingKeys) {
        const v = incoming[key];
        if (!v || typeof v !== "object") continue;
        const prev = merged[key] || merged[String(key)] || {};
        const nextStatus = String(v.status || "pending").toLowerCase();
        const prevStatus = String(prev.status || "").toLowerCase();
        if (nextStatus === "approved" || nextStatus === "denied") {
          if (!reviewer) continue;
          if (prevStatus && prevStatus !== "pending") continue;
          if (!prevStatus && nextStatus === "approved") continue;
          const contactId = String(v.contactId || prev.contactId || key);
          merged[key] = {
            contactId,
            name: v.name != null ? v.name : prev.name || "",
            company: v.company != null ? v.company : prev.company || "",
            owner: v.owner != null ? v.owner : prev.owner || "",
            requestedBy: v.requestedBy != null ? v.requestedBy : prev.requestedBy || "",
            requestedAt: v.requestedAt != null ? v.requestedAt : prev.requestedAt || "",
            status: nextStatus,
            reviewedAt: v.reviewedAt || (/* @__PURE__ */ new Date()).toISOString(),
            reviewedBy: v.reviewedBy || actorName
          };
          if (nextStatus === "approved") {
            const editKey = edits[contactId] != null ? contactId : edits[String(contactId)] != null ? String(contactId) : contactId;
            const overlay = Object.assign({}, edits[editKey] || {});
            overlay.archived = true;
            edits[editKey] = overlay;
            editsChanged = true;
          }
          continue;
        }
        if (nextStatus !== "pending") continue;
        if (prevStatus === "pending" || prevStatus === "approved") continue;
        merged[key] = {
          contactId: String(v.contactId || prev.contactId || key),
          name: v.name || prev.name || "",
          company: v.company || prev.company || "",
          owner: v.owner || prev.owner || "",
          requestedBy: v.requestedBy || actorName,
          requestedAt: v.requestedAt || (/* @__PURE__ */ new Date()).toISOString(),
          status: "pending",
          reviewedAt: "",
          reviewedBy: ""
        };
      }
      await store.setJSON("archiveRequests", merged);
      if (editsChanged) {
        await store.setJSON("contactEdits", edits);
      }
      return jsonResponse(request, 200, { ok: true, merged: true, keys: Object.keys(merged).length });
    }
    const writers = {
      saveDeals: ["deals", body.deals || []],
      saveNotes: ["notes", body.notes || {}],
      saveContactsAdded: ["contactsAdded", body.contactsAdded || []],
      saveContactEdits: ["contactEdits", body.contactEdits || {}],
      saveProposals: ["proposals", body.proposals || {}]
    };
    if (writers[action]) {
      if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
      const [key, value] = writers[action];
      if (key === "contactEdits") {
        await store.setJSON(key, preserveArchivedFlags(state.contactEdits, value));
      } else {
        await store.setJSON(key, value);
      }
      return jsonResponse(request, 200, { ok: true });
    }
    if (action === "ingestProposal") {
      const payload = body.proposal || body;
      const flagged = payload.status === "flagged" || payload.flagged === true;
      const stage = payload.paymentMode === "flex" || payload.flexSelected === true || payload.flexSelected === "true" ? "Flex Buy" : "Proposal Sent";
      const result = ingestOne(
        state,
        archive,
        {
          ...payload,
          stage,
          dnc: Boolean(payload.dnc),
          source: "Proposal Tool"
        },
        "Proposal Tool"
      );
      const proposal = {
        id: Date.now(),
        at: (/* @__PURE__ */ new Date()).toISOString(),
        status: flagged ? "flagged" : payload.status || "sent",
        customerName: payload.customerName || payload.name || "",
        company: payload.company || "",
        email: payload.email || "",
        phone: payload.phone || "",
        zip: payload.zip || "",
        delivery: payload.delivery || "",
        depot: payload.depot || "",
        containerDesc: payload.containerDesc || "",
        containerSize: payload.containerSize || "",
        condition: payload.condition || "",
        quantity: payload.quantity || 1,
        amount: asAmount(payload.unitPrice || payload.amount),
        wholesale: asAmount(payload.wholesaleCost || payload.wholesale),
        paymentMode: payload.paymentMode || (payload.flexSelected ? "flex" : "cash"),
        flexTermMonths: payload.flexTermMonths || "",
        clientType: payload.clientType || "",
        repName: payload.repName || "",
        repEmail: payload.repEmail || "",
        notes: payload.notes || payload.containerNotes || ""
      };
      const cid = result.contact.id;
      state.proposals[cid] = state.proposals[cid] || [];
      state.proposals[cid].unshift(proposal);
      await persistState(store, state);
      return jsonResponse(request, 200, {
        ok: true,
        created: result.created,
        contactId: cid,
        dealId: result.deal.id
      });
    }
    if (action === "importDeals") {
      const rows = Array.isArray(body.deals) ? body.deals : [];
      let created = 0;
      let matched = 0;
      const seen = /* @__PURE__ */ new Set();
      for (const row of rows) {
        const notes = row.notes || "";
        const dnc = notesSayDnc(notes, row.email || row.contactEmail, row.phone || row.contactPhone);
        let stage = mapStage(inferStage(notes));
        if (dnc && stage !== "Lost") {
          if (/registered with dnc|dnc-closed|dnc-number/i.test(notes)) stage = "DNC";
        }
        const result = ingestOne(
          state,
          archive,
          {
            name: row.contactName || row.name,
            company: realCompany(row.accountName || row.company),
            email: row.contactEmail || row.email,
            phone: row.contactPhone || row.phone,
            amount: row.amount,
            owner: row.beingWorkedBy || row.owner || row.dealOwner,
            notes,
            stage,
            dnc,
            source: "Drive Deals",
            containerDesc: row.container || "",
            depot: row.depot || "",
            zip: row.zip || "",
            clientType: /residential/i.test(String(row.accountName || row.company || "")) ? "Residential" : emptyIfNone(row.accountName || row.company) ? "Commercial" : ""
          },
          "Drive Deals"
        );
        if (result.created) created += 1;
        else matched += 1;
        seen.add(String(result.contact.id));
      }
      const seenKey = /* @__PURE__ */ new Map();
      const nextAdded = [];
      for (const c of state.contactsAdded) {
        const em = normEmail(c.email);
        const ph = normPhone(c.phone);
        const key = em || ph || normName(c.name) + "|" + normName(c.company);
        if (seenKey.has(key)) {
          const keep = seenKey.get(key);
          state.deals.forEach((d) => {
            if (String(d.contactId) === String(c.id)) d.contactId = keep.id;
          });
          continue;
        }
        seenKey.set(key, c);
        nextAdded.push(c);
      }
      state.contactsAdded = nextAdded;
      const dealSeen = /* @__PURE__ */ new Set();
      state.deals = state.deals.filter((d) => {
        const k = String(d.contactId);
        if (dealSeen.has(k)) return false;
        dealSeen.add(k);
        return true;
      });
      await persistState(store, state);
      await store.setJSON("importMeta", {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        source: "Deals_2026_07_31",
        rows: rows.length,
        created,
        matched,
        dealCount: state.deals.length
      });
      return jsonResponse(request, 200, {
        ok: true,
        rows: rows.length,
        created,
        matched,
        dealCount: state.deals.length,
        contactIds: seen.size
      });
    }
    if (action === "importContacts") {
      const rows = Array.isArray(body.contacts) ? body.contacts : [];
      let created = 0;
      let matched = 0;
      for (const row of rows) {
        const result = ingestOne(
          state,
          archive,
          {
            ...row,
            stage: row.stage || "New Lead",
            source: row.source || "Quote Form"
          },
          row.source || "Quote Form"
        );
        if (result.created) created += 1;
        else matched += 1;
      }
      await persistState(store, state);
      return jsonResponse(request, 200, { ok: true, rows: rows.length, created, matched });
    }
    return jsonResponse(request, 400, { error: "Unknown action", action });
  } catch (err) {
    console.error("crm-data error:", err);
    return jsonResponse(request, 500, {
      error: err.message || "Server error",
      code: err.code || "UNKNOWN"
    });
  }
}
__name(handleCrmData, "handleCrmData");

// src/meta-leadgen.js
var SOURCE = "Facebook Instant Form";
var SEEN_KEY = "meta-leadgen-seen";
var GRAPH = "https://graph.facebook.com/v21.0/";
function verifyToken(env) {
  return String(env && env.META_VERIFY_TOKEN || "").trim();
}
__name(verifyToken, "verifyToken");
function pageToken(env) {
  return String(env && env.META_PAGE_ACCESS_TOKEN || "").trim();
}
__name(pageToken, "pageToken");
function appSecret(env) {
  return String(env && env.META_APP_SECRET || "").trim();
}
__name(appSecret, "appSecret");
function ingestSecret(env) {
  return String(env && env.META_INGEST_SECRET || verifyToken(env) || "").trim();
}
__name(ingestSecret, "ingestSecret");
function pickStr(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return pickStr(v[0]);
  return String(v).trim();
}
__name(pickStr, "pickStr");
function fieldMap(fieldData) {
  const out = {};
  if (!Array.isArray(fieldData)) return out;
  for (const row of fieldData) {
    if (!row) continue;
    const key = String(row.name || row.field || "").trim().toLowerCase();
    const val = pickStr(row.values != null ? row.values : row.value);
    if (key && val) out[key] = val;
  }
  return out;
}
__name(fieldMap, "fieldMap");
function mapLead(fields, extra) {
  const f = fields || {};
  const first = pickStr(f.first_name || f.firstname);
  const last = pickStr(f.last_name || f.lastname);
  const full = pickStr(f.full_name || f.fullname || f.name || [first, last].filter(Boolean).join(" "));
  const email = pickStr(f.email || f.email_address || f.work_email);
  const phone = pickStr(f.phone_number || f.phone || f.mobile || f.mobile_number);
  const company = pickStr(f.company_name || f.company || f.business_name);
  const zip = pickStr(f.zip_code || f.zip || f.post_code || f.postal_code);
  const payload = {
    name: full,
    email,
    phone,
    company,
    zip,
    source: SOURCE,
    stage: "New Lead",
    notes: extra || ""
  };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === "") delete payload[k];
  });
  payload.source = SOURCE;
  payload.stage = "New Lead";
  return payload;
}
__name(mapLead, "mapLead");
async function hmacHex(secret, body) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex, "hmacHex");
async function signatureOk(request, env, raw) {
  const secret = appSecret(env);
  if (!secret) return true;
  const hdr = request.headers.get("X-Hub-Signature-256") || request.headers.get("x-hub-signature-256") || "";
  const got = hdr.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!got) return false;
  const expect = await hmacHex(secret, raw);
  if (got.length !== expect.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expect.charCodeAt(i);
  return diff === 0;
}
__name(signatureOk, "signatureOk");
function collectLeadgenIds(body) {
  const ids = [];
  const entries = body && body.entry || [];
  for (const entry of entries) {
    const changes = entry && entry.changes || [];
    for (const ch of changes) {
      const v = ch && ch.value;
      const id = v && (v.leadgen_id || v.lead_id);
      if (id) ids.push(String(id));
    }
  }
  if (body && body.leadgen_id) ids.push(String(body.leadgen_id));
  return [...new Set(ids.filter(Boolean))];
}
__name(collectLeadgenIds, "collectLeadgenIds");
async function fetchGraphLead(id, token) {
  const url = GRAPH + encodeURIComponent(id) + "?access_token=" + encodeURIComponent(token);
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data && data.error && data.error.message || "Graph " + res.status);
    err.code = "GRAPH";
    throw err;
  }
  return data;
}
__name(fetchGraphLead, "fetchGraphLead");
async function alreadySeen(store, id) {
  const seen = await store.get(SEEN_KEY, { type: "json" }) || {};
  return !!(seen && seen[id]);
}
__name(alreadySeen, "alreadySeen");
async function markSeen(store, id, contactId) {
  const seen = await store.get(SEEN_KEY, { type: "json" }) || {};
  seen[id] = { at: (/* @__PURE__ */ new Date()).toISOString(), contactId: contactId || "" };
  await store.setJSON(SEEN_KEY, seen);
}
__name(markSeen, "markSeen");
async function upsertFromPayload(env, payload, leadId) {
  const store = openStore(env);
  const archive = await loadArchive(store);
  const state = await readState(store);
  if (leadId && await alreadySeen(store, leadId)) {
    return { created: false, duplicate: true, contactId: (await store.get(SEEN_KEY, { type: "json" }))[leadId].contactId };
  }
  const result = ingestOne(state, archive, payload, SOURCE);
  await persistState(store, state);
  if (leadId) await markSeen(store, leadId, result.contact && result.contact.id);
  return {
    created: result.created,
    contactId: result.contact && result.contact.id,
    dealId: result.deal && result.deal.id
  };
}
__name(upsertFromPayload, "upsertFromPayload");
function hasIdentity(payload) {
  return !!(payload && (payload.email || payload.phone || payload.name));
}
__name(hasIdentity, "hasIdentity");
async function handleMetaLeadgen(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode") || url.searchParams.get("hub_mode") || "";
    const token = url.searchParams.get("hub.verify_token") || url.searchParams.get("hub_verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || url.searchParams.get("hub_challenge") || "";
    const expected = verifyToken(env);
    if (mode === "subscribe" && expected && token === expected && challenge) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return jsonResponse(request, 403, { error: "Verify failed", ok: false });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, 405, { error: "Method not allowed" });
  }
  const raw = await request.text();
  let body = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch (_) {
      return jsonResponse(request, 400, { error: "Invalid JSON" });
    }
  }
  const looksMeta = !!(body.object || body.entry || body.leadgen_id);
  if (looksMeta) {
    if (!await signatureOk(request, env, raw)) {
      return jsonResponse(request, 403, { error: "Bad signature" });
    }
    const ids = collectLeadgenIds(body);
    if (!ids.length) return jsonResponse(request, 200, { ok: true, ingested: 0 });
    const token = pageToken(env);
    if (!token) {
      return jsonResponse(request, 200, {
        ok: true,
        ingested: 0,
        pending: ids,
        need: "META_PAGE_ACCESS_TOKEN"
      });
    }
    const results = [];
    for (const id of ids) {
      try {
        const lead = await fetchGraphLead(id, token);
        const fields2 = fieldMap(lead.field_data);
        const payload2 = mapLead(fields2, "Facebook Instant Form lead " + id);
        if (!hasIdentity(payload2)) {
          results.push({ id, skipped: "no name/email/phone in form data" });
          continue;
        }
        const r2 = await upsertFromPayload(env, payload2, id);
        results.push({ id, ...r2 });
      } catch (err) {
        results.push({ id, error: err.message || "fetch failed" });
      }
    }
    return jsonResponse(request, 200, { ok: true, results });
  }
  const secret = ingestSecret(env);
  const got = (request.headers.get("x-ingest-secret") || url.searchParams.get("secret") || pickStr(body.secret) || "").trim();
  if (secret && got !== secret) {
    return jsonResponse(request, 401, { error: "Unauthorized" });
  }
  const fields = body.field_data ? fieldMap(body.field_data) : {
    full_name: body.full_name || body.name,
    email: body.email,
    phone_number: body.phone || body.phone_number,
    company_name: body.company || body.company_name,
    zip_code: body.zip || body.zip_code
  };
  const payload = mapLead(fields, pickStr(body.notes));
  if (!hasIdentity(payload)) {
    return jsonResponse(request, 400, { error: "Need an existing name, email, or phone" });
  }
  const leadId = pickStr(body.leadgen_id || body.id);
  const r = await upsertFromPayload(env, payload, leadId || "");
  return jsonResponse(request, 200, { ok: true, ...r });
}
__name(handleMetaLeadgen, "handleMetaLeadgen");

// src/index.js
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    if (path === "/auth/login") return handleLogin(request, env);
    if (path === "/auth/me") return handleMe(request, env);
    if (path === "/auth/logout") return handleLogout(request);
    if (path === "/auth/hop") {
      if (request.method === "GET") return handleHopConsume(request, env);
      return handleHopIssue(request, env);
    }
    if (path === "/crm-data") {
      if (request.method === "OPTIONS") return optionsResponse(request);
      return handleCrmData(request, env);
    }
    if (path === "/webhooks/meta-leadgen") {
      return handleMetaLeadgen(request, env);
    }
    return serveAssets(request, env);
  }
};
export {
  index_default as default
};
