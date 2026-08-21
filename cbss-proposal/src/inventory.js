import { jsonResponse, optionsResponse, readSession } from "./auth.js";
import { isInventoryStale, pullXchangeOffers, XCHANGE_SOURCE } from "./xchange.js";

export const INVENTORY_KV_KEY = "xchange-inventory";

function asList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.offers)) return raw.offers;
  if (Array.isArray(raw.items)) return raw.items;
  return [];
}

export function normalizeOffer(row) {
  if (!row || typeof row !== "object") return null;
  const size = String(row.size != null && row.size !== "" ? row.size : row.type || "").trim();
  const condition = row.condition != null ? String(row.condition).trim() : "";
  const depot = String(row.depot || row.location || row.city || "").replace(/\u00a0/g, " ").trim();
  const qtyRaw = row.qty != null ? row.qty : row.quantity;
  const costRaw = row.wholesaleCost != null ? row.wholesaleCost : row.wholesale != null ? row.wholesale : row.cost != null ? row.cost : row.price;
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

export async function readInventory(env) {
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

export async function refreshXchangeInventory(env, { fetchImpl, now, force } = {}) {
  if (!env || !env.CRM_STORE) return { ok: false, error: "No inventory store" };
  const when = now || new Date();
  let offers = [];
  try {
    offers = await pullXchangeOffers({ fetchImpl: fetchImpl || fetch });
  } catch (err) {
    const existing = await readInventory(env);
    return {
      ok: false,
      error: err && err.message ? err.message : "xChange pull failed",
      keptExisting: existing.offers.length > 0,
    };
  }
  const priced = (offers || [])
    .map(normalizeOffer)
    .filter((o) => o && o.wholesaleCost != null && o.wholesaleCost > 0);
  if (!priced.length) {
    const existing = await readInventory(env);
    return {
      ok: false,
      error: "xChange posted no priced pickup rows",
      keptExisting: existing.offers.length > 0,
    };
  }
  await env.CRM_STORE.put(
    INVENTORY_KV_KEY,
    JSON.stringify({
      offers: priced,
      pulledAt: when.toISOString(),
      source: XCHANGE_SOURCE,
      force: !!force,
    })
  );
  return { ok: true, count: priced.length, pulledAt: when.toISOString(), source: XCHANGE_SOURCE };
}

export async function inventoryForClient(env, { fetchImpl, now, force } = {}) {
  const current = await readInventory(env);
  const stale = !current.offers.length || isInventoryStale(current.pulledAt, now || new Date());
  if (!force && !stale) return current;
  const pulled = await refreshXchangeInventory(env, { fetchImpl, now, force });
  if (pulled.ok) {
    const fresh = await readInventory(env);
    return { ...fresh, refreshed: true };
  }
  if (current.offers.length) {
    return { ...current, refreshError: pulled.error };
  }
  return { offers: [], error: pulled.error, source: XCHANGE_SOURCE };
}

export async function handleInventory(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  return jsonResponse(request, 200, await inventoryForClient(env));
}

export async function handleInventoryRefresh(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  const pulled = await refreshXchangeInventory(env, { force: true });
  const body = await readInventory(env);
  if (!pulled.ok && !body.offers.length) {
    return jsonResponse(request, 502, { error: pulled.error, offers: [] });
  }
  return jsonResponse(request, 200, {
    ...body,
    refreshed: !!pulled.ok,
    refreshError: pulled.ok ? "" : pulled.error,
  });
}
