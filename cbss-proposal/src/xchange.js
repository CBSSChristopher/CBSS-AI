export const XCHANGE_SOURCE = "my-inventory.container-xchange.com/api/inventory";
export const PORTAL_ORIGIN = "https://my-inventory.container-xchange.com";
export const PORTAL_INVENTORY_URL = PORTAL_ORIGIN + "/api/inventory";
export const PORTAL_LOCATIONS_URL = PORTAL_ORIGIN + "/api/locations";
export const DEPOT_LOCATIONS_URL = "https://www.container-xchange.com/api/depot-locations";
export const SEARCH_URL = "https://www.container-xchange.com/api/search";
export const STALE_MS = 15 * 60 * 1000;

export const SEARCH_LIMIT = 80;
export const SEARCH_PAGE_CAP = 5;
const SEARCH_CONCURRENCY = 6;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function asNumber(raw) {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function cleanPlace(raw) {
  return String(raw || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isUsDepot(row) {
  const code = String(row && (row.unlocode_safe || row.unlocode || row.country_code) || "").toUpperCase();
  if (code.startsWith("US")) return true;
  const country = String(row && (row.country || row.Country) || "").trim().toUpperCase();
  return country === "US" || country === "USA" || country === "UNITED STATES";
}

/**
 * Posted pickup cost only. Never use starting_price, ending_price, or Max_Price —
 * those are city-wide ranges, not a size/grade wholesale.
 */
export function postedPickupPrice(row) {
  if (!row || typeof row !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(row, "starting_price") && row.Min_Price == null && row.Price == null && row.price == null) {
    return null;
  }
  const n = asNumber(row.Min_Price != null ? row.Min_Price : row.Price != null ? row.Price : row.price);
  return n != null && n > 0 ? n : null;
}

export function searchRowToOffer(row, geo = {}) {
  if (!row || typeof row !== "object") return null;
  const deal = String(row.Deal_Type || row.dealType || row.deal_type || "PICK_UP").toUpperCase();
  if (deal && deal !== "PICK_UP") return null;
  const damaged = row.Damaged === true || row.damaged === true || /damaged/i.test(String(row.Condition || row.condition || ""));
  if (damaged) return null;
  const type = cleanPlace(row.Type || row.type || row.size || "");
  const condition = cleanPlace(row.Condition || row.condition || "");
  const location = cleanPlace(row.Location || row.location || geo.location || "");
  const qty = asNumber(row.Total_Quantity != null ? row.Total_Quantity : row.qty != null ? row.qty : row.quantity);
  if (qty === 0) return null;
  const wholesaleCost = postedPickupPrice(row);
  if (wholesaleCost == null) return null;
  if (!type && !condition && !location) return null;
  return {
    id: "",
    size: type,
    condition,
    depot: location,
    location,
    city: geo.city || "",
    lat: geo.lat != null && Number.isFinite(Number(geo.lat)) ? Number(geo.lat) : null,
    lon: geo.lon != null && Number.isFinite(Number(geo.lon)) ? Number(geo.lon) : null,
    wholesaleCost,
    qty,
  };
}

export function offersFromSearchPayload(payload, geo = {}) {
  const rows = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.results)
      ? payload.results
      : [];
  return rows.map((row) => searchRowToOffer(row, geo)).filter(Boolean);
}

export function isInventoryStale(pulledAt, now = new Date(), maxAgeMs = STALE_MS) {
  if (!pulledAt) return true;
  const t = Date.parse(String(pulledAt));
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t > maxAgeMs;
}

export function locationSearchNames(locationName) {
  const name = cleanPlace(locationName);
  const out = [];
  if (name) out.push(name);
  const city = name.split(",")[0].trim();
  if (city && city !== name) out.push(city);
  if (city.includes("/")) out.push(city.split("/")[0].trim());
  return [...new Set(out.filter(Boolean))];
}

export function usDepotLocations(rows) {
  return (Array.isArray(rows) ? rows : []).filter(isUsDepot);
}

function offerKey(o) {
  return [cleanPlace(o.location || o.depot), cleanPlace(o.size), cleanPlace(o.condition), o.wholesaleCost].join("|");
}

const XCHANGE_HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": BROWSER_UA,
  Origin: "https://www.container-xchange.com",
  Referer: "https://www.container-xchange.com/inventory",
};

export function portalHeaders(env) {
  const headers = {
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": BROWSER_UA,
    Origin: PORTAL_ORIGIN,
    Referer: PORTAL_ORIGIN + "/",
  };
  const user = env && env.XCHANGE_USER_HASH ? String(env.XCHANGE_USER_HASH).trim() : "";
  const contact = env && env.XCHANGE_CONTACT_HASH ? String(env.XCHANGE_CONTACT_HASH).trim() : "";
  if (user) {
    const q = new URLSearchParams({ user });
    if (contact) q.set("contact", contact);
    headers.Referer = PORTAL_ORIGIN + "/?" + q.toString();
  }
  const session = env && env.XCHANGE_SESSION ? String(env.XCHANGE_SESSION).trim() : "";
  if (session) {
    headers.Cookie = session.includes("=") ? session.split(";")[0].trim() : "xchange_verified_session=" + session;
  }
  return headers;
}

export async function fetchXchangeJson(fetchImpl, url, headers = XCHANGE_HEADERS) {
  const res = await fetchImpl(url, { headers });
  if (!res.ok) {
    const snippet = String(await res.text().catch(() => "")).slice(0, 180);
    const err = new Error("xChange " + res.status);
    err.status = res.status;
    err.snippet = snippet;
    throw err;
  }
  return res.json();
}

export function portalListingRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.inventory)) return payload.inventory;
  if (payload && Array.isArray(payload.listings)) return payload.listings;
  return [];
}

export function geoByUnlocode(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.locations)
      ? payload.locations
      : [];
  const out = {};
  for (const row of rows) {
    const code = String((row && (row.unlocode || row.unlocode_safe || row.location_unlocode)) || "").toUpperCase();
    if (!code) continue;
    const lat = parseFloat(row.latitude != null ? row.latitude : row.lat);
    const lon = parseFloat(row.longitude != null ? row.longitude : row.lon);
    out[code] = {
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      name: cleanPlace(row.location_name || row.name || ""),
    };
  }
  return out;
}

/**
 * Buyer-portal listing → posted pickup offer. US PICK_UP only.
 * Uses the listing Price, never a city starting_price.
 */
export function portalListingToOffer(row, geoByCode = {}) {
  if (!row || typeof row !== "object") return null;
  const code = String(row.location_unlocode || row.unlocode_safe || row.unlocode || "").toUpperCase();
  if (code && !code.startsWith("US")) return null;
  if (!code) {
    const country = String(row.country || row.Country || row.country_code || "").trim().toUpperCase();
    if (country && country !== "US" && country !== "USA" && country !== "UNITED STATES") return null;
  }
  if (row.Damaged_Unit === true || row.Damaged_Unit === 1 || row.Damaged === true) return null;
  const geo = (code && geoByCode[code]) || {};
  const location = cleanPlace(row.Location || row.location || geo.name || "");
  return searchRowToOffer(
    {
      Deal_Type: row.Deal_Type || row.dealType || row.deal_type,
      Type: row.container_type_readable || row.Type || row.type,
      Condition: row.container_condition_readable || row.Condition || row.condition,
      Location: location,
      Total_Quantity: row.Quantity != null ? row.Quantity : row.Total_Quantity,
      Price: row.Price,
      Min_Price: row.Min_Price != null ? row.Min_Price : row.Price,
    },
    {
      location,
      city: location.split(",")[0].trim(),
      lat: geo.lat,
      lon: geo.lon,
    }
  );
}

export function offersFromPortalInventory(payload, geoByCode = {}) {
  const grouped = new Map();
  for (const row of portalListingRows(payload)) {
    const offer = portalListingToOffer(row, geoByCode);
    if (!offer) continue;
    const key = [cleanPlace(offer.location), cleanPlace(offer.size), cleanPlace(offer.condition)].join("|");
    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, { ...offer, qty: offer.qty != null ? offer.qty : 0 });
      continue;
    }
    if (offer.wholesaleCost < prev.wholesaleCost) prev.wholesaleCost = offer.wholesaleCost;
    if (offer.qty != null) prev.qty = (prev.qty || 0) + offer.qty;
  }
  return [...grouped.values()];
}

export async function probeXchange(fetchImpl = fetch) {
  const url = DEPOT_LOCATIONS_URL;
  try {
    const res = await fetchImpl(url, { headers: XCHANGE_HEADERS });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      snippet: text.slice(0, 180),
      cfRay: res.headers.get("cf-ray") || "",
    };
  } catch (err) {
    return { ok: false, status: 0, snippet: err && err.message ? err.message : "fetch failed" };
  }
}

async function fetchJson(fetchImpl, url) {
  return fetchXchangeJson(fetchImpl, url);
}

async function searchCity(fetchImpl, locationName, geo) {
  const names = locationSearchNames(locationName);
  for (const name of names) {
    const found = [];
    for (let page = 1; page <= SEARCH_PAGE_CAP; page++) {
      const url = new URL(SEARCH_URL);
      url.searchParams.set("location", name);
      url.searchParams.set("dealType", "PICK_UP");
      url.searchParams.set("excludeDamaged", "true");
      url.searchParams.set("limit", String(SEARCH_LIMIT));
      url.searchParams.set("page", String(page));
      let payload;
      try {
        payload = await fetchJson(fetchImpl, url.toString());
      } catch (_) {
        break;
      }
      const rows = Array.isArray(payload && payload.results) ? payload.results : [];
      found.push(...offersFromSearchPayload(payload, geo));
      if (!rows.length || rows.length < SEARCH_LIMIT) break;
    }
    if (found.length) return found;
  }
  return [];
}

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  const workers = [];
  for (let w = 0; w < Math.max(1, Math.min(n, items.length || 1)); w++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

function collectOffers(batches) {
  const seen = new Set();
  const offers = [];
  for (const list of batches) {
    for (const o of list || []) {
      if (!o || o.wholesaleCost == null || !(o.wholesaleCost > 0)) continue;
      const key = offerKey(o);
      if (seen.has(key)) continue;
      seen.add(key);
      offers.push(o);
    }
  }
  return offers;
}

async function pullXchangeOffersDirect(fetchImpl) {
  const locations = usDepotLocations(await fetchJson(fetchImpl, DEPOT_LOCATIONS_URL));
  if (!locations.length) return [];
  const batches = await mapPool(locations, SEARCH_CONCURRENCY, async (loc) => {
    const name = cleanPlace(loc.location_name || loc.name || "");
    const lat = parseFloat(loc.latitude != null ? loc.latitude : loc.lat);
    const lon = parseFloat(loc.longitude != null ? loc.longitude : loc.lon);
    return searchCity(fetchImpl, name, {
      location: name,
      city: name.split(",")[0].trim(),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    });
  });
  return collectOffers(batches);
}

async function pullXchangeOffersPortal(fetchImpl, env) {
  const headers = portalHeaders(env);
  const inventory = await fetchXchangeJson(fetchImpl, PORTAL_INVENTORY_URL, headers);
  let geo = {};
  try {
    geo = geoByUnlocode(await fetchXchangeJson(fetchImpl, PORTAL_LOCATIONS_URL, headers));
  } catch (_) {
    geo = {};
  }
  return collectOffers([offersFromPortalInventory(inventory, geo)]);
}

export async function pullXchangeViaBrowser(env) {
  if (!env || !env.BROWSER) return [];
  const puppeteer = await import("@cloudflare/puppeteer");
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.goto("https://www.container-xchange.com/inventory", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    const raw = await page.evaluate(async () => {
      const locRes = await fetch("/api/depot-locations", { headers: { Accept: "application/json" } });
      if (!locRes.ok) return { error: "locations " + locRes.status, cities: [] };
      const locations = await locRes.json();
      const us = (Array.isArray(locations) ? locations : []).filter((r) => {
        const code = String((r && (r.unlocode_safe || r.unlocode || r.country_code)) || "").toUpperCase();
        if (code.startsWith("US")) return true;
        const country = String((r && (r.country || r.Country)) || "").trim().toUpperCase();
        return country === "US" || country === "USA" || country === "UNITED STATES";
      });
      const cities = [];
      for (const loc of us) {
        const name = String((loc && loc.location_name) || "").trim();
        const names = [name];
        const city = name.split(",")[0].trim();
        if (city && city !== name) names.push(city);
        if (city.includes("/")) names.push(city.split("/")[0].trim());
        let rows = [];
        for (const q of names) {
          const found = [];
          for (let pageNo = 1; pageNo <= 5; pageNo++) {
            const url =
              "/api/search?location=" +
              encodeURIComponent(q) +
              "&dealType=PICK_UP&excludeDamaged=true&limit=80&page=" +
              pageNo;
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) break;
            const data = await res.json();
            const batch = Array.isArray(data && data.results) ? data.results : [];
            found.push(...batch);
            if (!batch.length || batch.length < 80) break;
          }
          if (found.length) {
            rows = found;
            break;
          }
        }
        cities.push({
          location: name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          rows,
        });
      }
      return { cities };
    });
    if (raw && raw.error) throw new Error(raw.error);
    const batches = (raw && raw.cities ? raw.cities : []).map((city) =>
      offersFromSearchPayload(
        { results: city.rows || [] },
        {
          location: city.location,
          city: String(city.location || "").split(",")[0].trim(),
          lat: city.latitude,
          lon: city.longitude,
        }
      )
    );
    return collectOffers(batches);
  } finally {
    await browser.close();
  }
}

export async function pullXchangeOffers({ fetchImpl = fetch, env, allowBrowser } = {}) {
  let portalError = null;
  try {
    const viaPortal = await pullXchangeOffersPortal(fetchImpl, env);
    if (viaPortal.length) return viaPortal;
  } catch (err) {
    portalError = err;
  }
  let directError = null;
  try {
    const offers = await pullXchangeOffersDirect(fetchImpl);
    if (offers.length) return offers;
  } catch (err) {
    directError = err;
    if (allowBrowser === false || !env || !env.BROWSER) {
      if (portalError) throw portalError;
      throw err;
    }
  }
  if (allowBrowser === false || !env || !env.BROWSER) return [];
  const viaBrowser = await pullXchangeViaBrowser(env);
  if (viaBrowser.length) return viaBrowser;
  if (portalError) throw portalError;
  if (directError) throw directError;
  return [];
}
