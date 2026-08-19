import { jsonResponse, optionsResponse, readSession } from "./auth.js";

const INVENTORY_KV_KEY = "xchange-inventory";

function asList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.offers)) return raw.offers;
  if (Array.isArray(raw.items)) return raw.items;
  return [];
}

function normalizeOffer(row) {
  if (!row || typeof row !== "object") return null;
  const size = row.size != null ? String(row.size).trim() : "";
  const condition = row.condition != null ? String(row.condition).trim() : "";
  const depot = String(row.depot || row.location || row.city || "").replace(/\u00a0/g, " ").trim();
  const qtyRaw = row.qty != null ? row.qty : row.quantity;
  const costRaw = row.wholesaleCost != null ? row.wholesaleCost : row.wholesale != null ? row.wholesale : row.cost;
  const lat = parseFloat(row.lat);
  const lon = parseFloat(row.lon);
  let wholesaleCost = null;
  if (costRaw != null && costRaw !== "") {
    const n = parseFloat(String(costRaw).replace(/[$,]/g, ""));
    if (Number.isFinite(n) && n > 0) wholesaleCost = n;
  }
  let qty = null;
  if (qtyRaw != null && qtyRaw !== "") {
    const q = parseFloat(qtyRaw);
    if (Number.isFinite(q)) qty = q;
  }
  return {
    id: row.id != null ? String(row.id) : "",
    size,
    condition,
    depot,
    location: String(row.location || "").replace(/\u00a0/g, " ").trim(),
    city: String(row.city || "").replace(/\u00a0/g, " ").trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    wholesaleCost,
    qty,
  };
}

async function readInventory(env) {
  if (!env || !env.CRM_STORE) return { offers: [] };
  let raw = null;
  try {
    raw = await env.CRM_STORE.get(INVENTORY_KV_KEY, { type: "json" });
  } catch (_) {
    raw = null;
  }
  if (!raw) return { offers: [] };
  const offers = asList(raw).map(normalizeOffer).filter(Boolean);
  const body = { offers };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.pulledAt) body.pulledAt = raw.pulledAt;
    if (raw.source) body.source = raw.source;
  }
  return body;
}

export async function handleInventory(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  return jsonResponse(request, 200, await readInventory(env));
}
