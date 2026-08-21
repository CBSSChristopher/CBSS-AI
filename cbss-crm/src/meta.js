export const META_SOURCE = "Facebook Instant Form";
export const META_CONFIG_KEY = "meta-config";
export const META_WEBHOOK_PATH = "/webhooks/meta-leadgen";
export const GRAPH = "https://graph.facebook.com/v21.0/";

export function pickStr(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return pickStr(v[0]);
  return String(v).trim();
}

export function fieldMap(fieldData) {
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

export function titleOwner(s) {
  const raw = String(s == null ? "" : s).trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (/^contact owner$/i.test(raw)) return "";
  return raw.split(" ").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "")).join(" ");
}

const OWNER_FIELD_KEYS = [
  "owner",
  "rep",
  "sales_rep",
  "salesrep",
  "assigned_to",
  "which_rep",
  "preferred_rep",
  "who_helped_you",
  "who_should_contact_you"
];

export function ownerFromFields(fields) {
  const f = fields && typeof fields === "object" ? fields : {};
  for (const key of OWNER_FIELD_KEYS) {
    const val = titleOwner(f[key]);
    if (val) return val;
  }
  return "";
}

export function resolveLeadOwner(fields, meta, extras) {
  const fromLead = ownerFromFields(fields);
  if (fromLead) return fromLead;
  const src = meta && typeof meta === "object" ? meta : {};
  const map = src.formOwners && typeof src.formOwners === "object" ? src.formOwners : {};
  const formId = pickStr(extras && extras.formId);
  const formName = pickStr(extras && extras.formName);
  if (formId && map[formId]) return titleOwner(map[formId]) || pickStr(map[formId]);
  if (formName && map[formName]) return titleOwner(map[formName]) || pickStr(map[formName]);
  const want = formName.toLowerCase();
  if (want) {
    for (const [key, val] of Object.entries(map)) {
      if (String(key).toLowerCase() === want && val) return titleOwner(val) || String(val);
    }
  }
  return titleOwner(src.defaultOwner) || "Christopher Banks";
}

export function mapLead(fields, extra, meta, extras) {
  const f = fields || {};
  const first = pickStr(f.first_name || f.firstname);
  const last = pickStr(f.last_name || f.lastname);
  const full = pickStr(f.full_name || f.fullname || f.name || [first, last].filter(Boolean).join(" "));
  const email = pickStr(f.email || f.email_address || f.work_email);
  const phone = pickStr(f.phone_number || f.phone || f.mobile || f.mobile_number);
  const company = pickStr(f.company_name || f.company || f.business_name);
  const zip = pickStr(f.zip_code || f.zip || f.post_code || f.postal_code);
  const owner = resolveLeadOwner(f, meta, extras);
  const payload = {
    name: full,
    email,
    phone,
    company,
    zip,
    owner,
    source: META_SOURCE,
    stage: "New Lead",
    notes: extra || ""
  };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === "") delete payload[k];
  });
  payload.source = META_SOURCE;
  payload.stage = "New Lead";
  payload.owner = owner;
  return payload;
}

export function collectLeadgenEvents(body) {
  const events = [];
  const seen = new Set();
  const entries = body && body.entry || [];
  for (const entry of entries) {
    const changes = entry && entry.changes || [];
    for (const ch of changes) {
      const v = ch && ch.value || {};
      const id = v.leadgen_id || v.lead_id;
      if (!id) continue;
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({
        id: key,
        formId: pickStr(v.form_id),
        pageId: pickStr(v.page_id || (entry && entry.id))
      });
    }
  }
  if (body && body.leadgen_id) {
    const key = String(body.leadgen_id);
    if (!seen.has(key)) {
      events.push({
        id: key,
        formId: pickStr(body.form_id),
        pageId: pickStr(body.page_id)
      });
    }
  }
  return events;
}

export function verifyHandshake(query, expected) {
  const q = query && typeof query === "object" ? query : {};
  const mode = pickStr(q.mode || q["hub.mode"] || q.hub_mode);
  const token = pickStr(q.token || q["hub.verify_token"] || q.hub_verify_token);
  const challenge = pickStr(q.challenge || q["hub.challenge"] || q.hub_challenge);
  const want = pickStr(expected);
  if (mode === "subscribe" && want && token === want && challenge) {
    return { ok: true, challenge };
  }
  return { ok: false };
}

export function normalizeMetaConfig(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const formOwners = {};
  if (src.formOwners && typeof src.formOwners === "object") {
    Object.keys(src.formOwners).forEach((key) => {
      const val = pickStr(src.formOwners[key]);
      if (key && val) formOwners[String(key)] = val;
    });
  }
  const forms = Array.isArray(src.forms)
    ? src.forms.filter((f) => f && (f.id || f.name)).map((f) => ({
      id: pickStr(f.id),
      name: pickStr(f.name),
      status: pickStr(f.status),
      leadsCount: Number(f.leadsCount || f.leads_count || 0) || 0
    }))
    : [];
  return {
    verifyToken: pickStr(src.verifyToken),
    pageAccessToken: pickStr(src.pageAccessToken),
    appId: pickStr(src.appId),
    appSecret: pickStr(src.appSecret),
    pageId: pickStr(src.pageId),
    pageName: pickStr(src.pageName),
    webhookRegistered: Boolean(src.webhookRegistered),
    defaultOwner: titleOwner(src.defaultOwner) || "Christopher Banks",
    formOwners,
    forms,
    lastWebhookAt: pickStr(src.lastWebhookAt),
    lastImportAt: pickStr(src.lastImportAt)
  };
}

export function ensureVerifyToken(cfg, token) {
  const next = normalizeMetaConfig(cfg);
  if (next.verifyToken) return next;
  next.verifyToken = pickStr(token) || ("cbss-" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10));
  return next;
}

export function publicMetaStatus(cfg, webhookUrl) {
  const src = normalizeMetaConfig(cfg);
  return {
    webhookUrl: webhookUrl || "",
    verifyToken: src.verifyToken,
    hasPageToken: Boolean(src.pageAccessToken),
    appId: src.appId,
    hasAppSecret: Boolean(src.appSecret),
    webhookRegistered: Boolean(src.webhookRegistered),
    pageId: src.pageId,
    pageName: src.pageName,
    defaultOwner: src.defaultOwner,
    formOwners: src.formOwners,
    forms: src.forms,
    lastWebhookAt: src.lastWebhookAt,
    lastImportAt: src.lastImportAt,
    connected: Boolean(src.pageAccessToken && src.pageId)
  };
}

export function facebookLeadTask() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const followUpDate = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  return {
    nextAction: "Call — Facebook lead",
    followUpDate,
    updatedAt: d.toISOString()
  };
}

export function hasIdentity(payload) {
  return !!(payload && (payload.email || payload.phone || payload.name));
}

export function appAccessToken(appId, appSecret) {
  const id = pickStr(appId);
  const secret = pickStr(appSecret);
  if (!id || !secret) return "";
  return id + "|" + secret;
}

export function appSubscriptionPayload(webhookUrl, verifyToken) {
  return {
    object: "page",
    callback_url: pickStr(webhookUrl),
    verify_token: pickStr(verifyToken),
    fields: "leadgen",
    include_values: "true"
  };
}
