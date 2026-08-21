export const XCHANGE_SOURCE = "container-xchange.com/api/search";
export const DEPOT_LOCATIONS_URL = "https://www.container-xchange.com/api/depot-locations";
export const SEARCH_URL = "https://www.container-xchange.com/api/search";
export const STALE_MS = 15 * 60 * 1000;

const SEARCH_LIMIT = 80;
const SEARCH_PAGE_CAP = 5;
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

export async function fetchXchangeJson(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: XCHANGE_HEADERS });
  if (!res.ok) {
    const snippet = String(await res.text().catch(() => "")).slice(0, 180);
    const err = new Error("xChange " + res.status);
    err.status = res.status;
    err.snippet = snippet;
    throw err;
  }
  return res.json();
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
      const us = (Array.isArray(locations) ? locations : []).filter((r) =>
        String((r && r.unlocode_safe) || "").toUpperCase().startsWith("US")
      );
      const cities = [];
      for (const loc of us) {
        const name = String((loc && loc.location_name) || "").trim();
        const names = [name];
        const city = name.split(",")[0].trim();
        if (city && city !== name) names.push(city);
        if (city.includes("/")) names.push(city.split("/")[0].trim());
        let rows = [];
        for (const q of names) {
          const url =
            "/api/search?location=" +
            encodeURIComponent(q) +
            "&dealType=PICK_UP&excludeDamaged=true&limit=80&page=1";
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) continue;
          const data = await res.json();
          const found = Array.isArray(data && data.results) ? data.results : [];
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
  let directError = null;
  try {
    const offers = await pullXchangeOffersDirect(fetchImpl);
    if (offers.length) return offers;
  } catch (err) {
    directError = err;
    if (allowBrowser === false || !env || !env.BROWSER) throw err;
  }
  if (allowBrowser === false || !env || !env.BROWSER) return [];
  const viaBrowser = await pullXchangeViaBrowser(env);
  if (viaBrowser.length) return viaBrowser;
  if (directError) throw directError;
  return [];
}
