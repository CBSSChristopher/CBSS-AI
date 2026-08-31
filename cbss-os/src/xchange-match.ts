export type DepotHub = { name: string; lat: number; lon: number; region: string };

export const DEPOTS: DepotHub[] = [
  { name: "Memphis, TN", lat: 35.15, lon: -90.05, region: "Midwest" },
  { name: "Chicago, IL", lat: 41.88, lon: -87.63, region: "Midwest" },
  { name: "Detroit, MI", lat: 42.33, lon: -83.05, region: "Midwest" },
  { name: "Indianapolis, IN", lat: 39.77, lon: -86.16, region: "Midwest" },
  { name: "St. Louis, MO", lat: 38.63, lon: -90.20, region: "Midwest" },
  { name: "Kansas City, MO", lat: 39.10, lon: -94.58, region: "Midwest" },
  { name: "Louisville, KY", lat: 38.25, lon: -85.76, region: "Midwest" },
  { name: "Columbus, OH", lat: 39.96, lon: -83.00, region: "Midwest" },
  { name: "Cleveland, OH", lat: 41.50, lon: -81.69, region: "Midwest" },
  { name: "Atlanta, GA", lat: 33.75, lon: -84.39, region: "East Coast" },
  { name: "Charlotte, NC", lat: 35.23, lon: -80.84, region: "East Coast" },
  { name: "Charleston, SC", lat: 32.78, lon: -79.93, region: "East Coast" },
  { name: "Savannah, GA", lat: 32.08, lon: -81.09, region: "East Coast" },
  { name: "Jacksonville, FL", lat: 30.33, lon: -81.66, region: "East Coast" },
  { name: "Miami, FL", lat: 25.76, lon: -80.19, region: "East Coast" },
  { name: "Tampa, FL", lat: 27.95, lon: -82.46, region: "East Coast" },
  { name: "Norfolk, VA", lat: 36.85, lon: -76.29, region: "East Coast" },
  { name: "Baltimore, MD", lat: 39.29, lon: -76.61, region: "East Coast" },
  { name: "Philadelphia, PA", lat: 39.95, lon: -75.17, region: "East Coast" },
  { name: "Newark, NJ", lat: 40.74, lon: -74.17, region: "East Coast" },
  { name: "New York, NY", lat: 40.71, lon: -74.01, region: "East Coast" },
  { name: "Boston, MA", lat: 42.36, lon: -71.06, region: "East Coast" },
  { name: "Wilmington, NC", lat: 34.23, lon: -77.94, region: "East Coast" },
  { name: "Chesapeake, VA", lat: 36.77, lon: -76.29, region: "East Coast" },
  { name: "Cincinnati, OH", lat: 39.10, lon: -84.51, region: "Midwest" },
  { name: "Minneapolis, MN", lat: 44.98, lon: -93.27, region: "Midwest" },
  { name: "Nashville, TN", lat: 36.16, lon: -86.78, region: "Midwest" },
  { name: "Omaha, NE", lat: 41.26, lon: -95.93, region: "Midwest" },
  { name: "Mobile, AL", lat: 30.70, lon: -88.04, region: "East Coast" },
  { name: "New Orleans, LA", lat: 29.95, lon: -90.07, region: "East Coast" },
  { name: "Houston, TX", lat: 29.76, lon: -95.37, region: "West Coast" },
  { name: "Dallas, TX", lat: 32.78, lon: -96.80, region: "West Coast" },
  { name: "San Antonio, TX", lat: 29.42, lon: -98.49, region: "West Coast" },
  { name: "El Paso, TX", lat: 31.76, lon: -106.49, region: "West Coast" },
  { name: "Los Angeles, CA", lat: 34.05, lon: -118.24, region: "West Coast" },
  { name: "Long Beach, CA", lat: 33.77, lon: -118.19, region: "West Coast" },
  { name: "Oakland, CA", lat: 37.80, lon: -122.27, region: "West Coast" },
  { name: "San Francisco, CA", lat: 37.77, lon: -122.42, region: "West Coast" },
  { name: "Bakersfield, CA", lat: 35.37, lon: -119.02, region: "West Coast" },
  { name: "Seattle, WA", lat: 47.61, lon: -122.33, region: "West Coast" },
  { name: "Tacoma, WA", lat: 47.25, lon: -122.44, region: "West Coast" },
  { name: "Portland, OR", lat: 45.52, lon: -122.68, region: "West Coast" },
  { name: "Phoenix, AZ", lat: 33.45, lon: -112.07, region: "West Coast" },
  { name: "Denver, CO", lat: 39.74, lon: -104.99, region: "West Coast" },
  { name: "Salt Lake City, UT", lat: 40.76, lon: -111.89, region: "West Coast" },
];

export const RATE_SHEET: Record<string, { base: number; perMile: number }> = {
  Midwest: { base: 475, perMile: 5 },
  "East Coast": { base: 600, perMile: 7 },
  "West Coast": { base: 600, perMile: 8 },
};

export const SIZE_SURCHARGE: Record<string, number> = { "20ft": 0, "40ft": 125, Specialized: 200 };

export type BoxPick = { size: string; height: string; config: string; grade: string };

export type RawOffer = {
  size?: string;
  condition?: string;
  depot?: string;
  city?: string;
  location?: string;
  wholesaleCost?: number | string;
  qty?: number | string;
  lat?: number | string;
  lon?: number | string;
};

export type ZipGeo = { lat: number; lon: number; place: string };

export type PostedMatch = {
  ok: boolean;
  error?: string;
  wholesale?: number;
  size?: string;
  condition?: string;
  depot?: string;
  city?: string;
  miles?: number | null;
  qty?: number | null;
  region?: string;
  delivery?: number;
  skippedCity?: string;
  matches?: number;
};

function compactSpec(raw: unknown): string {
  return String(raw || "").toLowerCase().replace(/[\s_\-./()]+/g, "");
}

export function parseOfferConfig(raw: unknown): string {
  const n = compactSpec(raw);
  if (!n) return "standard";
  if (n.includes("tridoor") || n.includes("3door")) return "tri-door";
  if (n.includes("fullopen") || n.includes("opensidefull") || n.includes("fullopenside")) return "full-open-side";
  if (n.includes("opentop") || n.includes("flatrack") || n.includes("duocon") || n.includes("reefer")) return "other";
  const openSide =
    n.includes("openside") || n.includes("sidedoor") || n.includes("os2d") || n.includes("os4d") ||
    /(^|[^a-z])os([^a-z]|$)/.test(n);
  if (openSide) {
    if (n.includes("os2d") || n.includes("openside2") || n.includes("2doors") || /(?:os|openside|sidedoor)2d/.test(n)) {
      return "side-os-2d";
    }
    if (n.includes("os4d") || n.includes("openside4") || n.includes("4doors") || /(?:os|openside|sidedoor)4d/.test(n)) {
      return "side-os-4d";
    }
    return "side-door";
  }
  if (n.includes("doubledoor") || n.includes("tunnel")) return "double-door";
  return "standard";
}

export function parseOfferSpec(raw: unknown): BoxPick {
  const n = compactSpec(raw);
  let size = "";
  if (n.includes("53")) size = "53";
  else if (n.includes("45")) size = "45";
  else if (n.includes("40")) size = "40";
  else if (n.includes("20")) size = "20";
  else if (n.includes("10")) size = "10";
  let height = "DC";
  if (n.includes("highcube") || n.includes("40hc") || n.includes("20hc") || n.includes("45hc") || n.includes("hq") || /(^|[^a-z])hc([^a-z]|$)/.test(n)) {
    height = "HC";
  }
  return { size, height, config: parseOfferConfig(raw), grade: "" };
}

export function specsCompatible(want: BoxPick, got: BoxPick): boolean {
  if (!want || !got) return false;
  if (want.size && got.size && String(want.size) !== String(got.size)) return false;
  if (want.height && got.height && want.height !== got.height) return false;
  if (want.config && want.config !== "standard") {
    if (got.config && got.config !== want.config) return false;
  } else if (got.config && got.config !== "standard") {
    return false;
  }
  return true;
}

export function mapOfferCondition(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s === "CW" || s === "IICL" || s === "WWT" || s === "OneTrip" || s === "AsIs") return s;
  const n = s.toLowerCase().replace(/[\s\-_&/().]/g, "");
  if (n.includes("iicl") || n.includes("multitrip")) return "IICL";
  if (n === "cw" || n === "cargoworthy") return "CW";
  if (n.includes("wwt") || n.includes("windwatertight") || n.includes("windandwatertight")) return "WWT";
  if (n === "new" || n === "newbuild" || n.includes("onetrip")) return "OneTrip";
  if (n.includes("asis")) return "AsIs";
  return "";
}

export function offerWholesale(o: RawOffer | null | undefined): number | null {
  if (!o) return null;
  const v = o.wholesaleCost;
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function offerQty(o: RawOffer | null | undefined): number | null {
  const n = parseFloat(String(o && o.qty != null ? o.qty : ""));
  return Number.isFinite(n) ? n : null;
}

function cleanPlace(raw: unknown): string {
  return String(raw || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function cityKey(city: string, state: string): string {
  const n = (s: string) => cleanPlace(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return n(city) + "|" + n(state);
}

function parseCityState(raw: unknown): { city: string; state: string } | null {
  const s = cleanPlace(raw);
  const m = s.match(/^([^,]+),\s*([A-Za-z]{2})\s*$/);
  if (!m) return null;
  return { city: m[1].trim(), state: m[2].toUpperCase() };
}

function aliasCityState(parsed: { city: string; state: string } | null): { city: string; state: string } | null {
  if (!parsed || !parsed.city) return parsed;
  const c = cleanPlace(parsed.city).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const st = String(parsed.state || "").toUpperCase();
  if (c === "saint louis" || c === "st louis") return { city: "St. Louis", state: "MO" };
  if (c === "kansas city") return { city: "Kansas City", state: "MO" };
  if (c === "minneapolis" || c.indexOf("minneapolis") === 0 || c === "saint paul" || c === "st paul") {
    return { city: "Minneapolis", state: "MN" };
  }
  if (c === "fort worth") return { city: "Dallas", state: "TX" };
  if (c === "jersey city" || c === "elizabeth") return { city: "Newark", state: "NJ" };
  if (c === "san pedro" || (c === "wilmington" && st === "CA")) return { city: "Long Beach", state: "CA" };
  if (c === "newport news" || c === "portsmouth" || c === "virginia beach") return { city: "Norfolk", state: "VA" };
  return parsed;
}

export function findCityHub(text: unknown): { city: string; state: string; lat: number | null; lon: number | null; region: string } | null {
  const parsed = aliasCityState(parseCityState(text));
  if (parsed) {
    const hit = DEPOTS.find((d) => {
      const parts = d.name.split(",");
      return cityKey(parts[0], parts[1] || "") === cityKey(parsed.city, parsed.state);
    });
    if (hit) return { city: parsed.city, state: parsed.state, lat: hit.lat, lon: hit.lon, region: hit.region };
    return { city: parsed.city, state: parsed.state, lat: null, lon: null, region: "" };
  }
  const n = cleanPlace(text).toLowerCase();
  if (!n) return null;
  const hubs = DEPOTS.map((d) => {
    const parts = d.name.split(",");
    return { city: parts[0].trim(), state: (parts[1] || "").trim(), lat: d.lat, lon: d.lon, region: d.region };
  }).sort((a, b) => b.city.length - a.city.length);
  for (const h of hubs) {
    if (n.indexOf(h.city.toLowerCase()) >= 0) return h;
  }
  return null;
}

export function resolveOfferCity(o: RawOffer): ReturnType<typeof findCityHub> {
  return findCityHub(o.location) || findCityHub(o.depot) || findCityHub(o.city);
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function rateSheetSize(size: string, config: string): string {
  if (config && config !== "standard") return "Specialized";
  if (size === "10" || size === "20") return "20ft";
  if (size === "40" || size === "45") return "40ft";
  if (size === "53") return "Specialized";
  return "40ft";
}

export function calcDelivery(region: string, miles: number, sizeKey: string): number {
  const rates = RATE_SHEET[region];
  if (!rates) return 0;
  let fee = rates.base;
  if (miles > 100) fee += (miles - 100) * rates.perMile;
  fee += SIZE_SURCHARGE[sizeKey] || 0;
  return Math.round(fee);
}

export function offerMatchesBox(o: RawOffer, want: BoxPick, qty: number): boolean {
  const q = offerQty(o);
  if (q === 0) return false;
  if (q != null && q < qty) return false;
  if (!offerWholesale(o)) return false;
  if (!specsCompatible(want, parseOfferSpec(o.size || ""))) return false;
  const grade = mapOfferCondition(o.condition);
  if (want.grade && (!grade || grade !== want.grade)) return false;
  return true;
}

export function matchPostedBox(offers: RawOffer[], want: BoxPick, geo: ZipGeo, qty = 1, fulfillment = "deliver"): PostedMatch {
  const list = Array.isArray(offers) ? offers : [];
  const priced = list.filter((o) => offerWholesale(o));
  if (!priced.length) {
    return { ok: false, error: "No posted Container Exchange wholesale number. Do not invent a price." };
  }
  const byCity = new Map<string, { city: string; state: string; lat: number | null; lon: number | null; region: string; miles: number | null }>();
  for (const o of priced) {
    const resolved = resolveOfferCity(o);
    if (!resolved) continue;
    const key = cityKey(resolved.city, resolved.state);
    const dlat = o.lat != null && o.lat !== "" ? Number(o.lat) : resolved.lat;
    const dlon = o.lon != null && o.lon !== "" ? Number(o.lon) : resolved.lon;
    const miles = Number.isFinite(dlat) && Number.isFinite(dlon)
      ? Math.round(haversine(geo.lat, geo.lon, Number(dlat), Number(dlon)))
      : null;
    const existing = byCity.get(key);
    if (!existing) {
      byCity.set(key, {
        city: resolved.city,
        state: resolved.state,
        lat: Number.isFinite(Number(dlat)) ? Number(dlat) : null,
        lon: Number.isFinite(Number(dlon)) ? Number(dlon) : null,
        region: resolved.region,
        miles,
      });
    } else if (miles != null && (existing.miles == null || miles < existing.miles)) {
      existing.miles = miles;
    }
  }
  const cities = Array.from(byCity.values()).sort((a, b) => {
    if (a.miles == null && b.miles == null) return a.city.localeCompare(b.city);
    if (a.miles == null) return 1;
    if (b.miles == null) return -1;
    return a.miles - b.miles;
  });
  let skipped = "";
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    if (city.miles != null && city.miles > 800) continue;
    const key = cityKey(city.city, city.state);
    const hits = priced.filter((o) => {
      if (!offerMatchesBox(o, want, qty)) return false;
      const resolved = resolveOfferCity(o);
      return resolved ? cityKey(resolved.city, resolved.state) === key : false;
    }).sort((a, b) => (offerWholesale(a) || 0) - (offerWholesale(b) || 0));
    if (hits.length) {
      if (i > 0) skipped = cities[0].city + ", " + cities[0].state;
      const o = hits[0];
      const wholesale = offerWholesale(o) as number;
      const sizeKey = rateSheetSize(want.size, want.config);
      const delivery = fulfillment === "pickup" ? 0 : calcDelivery(city.region, city.miles || 0, sizeKey);
      return {
        ok: true,
        wholesale,
        size: o.size,
        condition: String(o.condition || ""),
        depot: cleanPlace(o.depot || o.location || o.city),
        city: city.city + ", " + city.state,
        miles: city.miles,
        qty: offerQty(o),
        region: city.region,
        delivery,
        skippedCity: skipped,
        matches: hits.length,
      };
    }
  }
  return {
    ok: false,
    error: "No matching posted xChange box within 800 miles for that size, grade, and qty. Do not invent a wholesale.",
  };
}

export function lookupZipFromZippopotam(data: { places?: Array<Record<string, string>> }): ZipGeo | null {
  const place = data && data.places && data.places[0];
  if (!place) return null;
  const lat = parseFloat(place.latitude);
  const lon = parseFloat(place.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, place: `${place["place name"]}, ${place["state abbreviation"]}` };
}
