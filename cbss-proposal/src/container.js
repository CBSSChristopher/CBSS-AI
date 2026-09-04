export const SIZES = [
  { value: "10", label: "10 ft" },
  { value: "20", label: "20 ft" },
  { value: "40", label: "40 ft" },
  { value: "45", label: "45 ft" },
  { value: "53", label: "53 ft" },
];

export const HEIGHTS = [
  { value: "DC", label: "Standard height / DC" },
  { value: "HC", label: "High cube / HC" },
];

export const CONFIGS = [
  { value: "standard", label: "Standard" },
  { value: "tri-door", label: "Tri-door" },
  { value: "double-door", label: "Double door" },
  { value: "side-os-2d", label: "Side door (OS 2D)" },
  { value: "side-os-4d", label: "Side door (OS 4D)" },
  { value: "side-door", label: "Side door" },
  { value: "full-open-side", label: "Full open side" },
  { value: "other", label: "Other / specialized" },
];

export const GRADES = [
  { value: "CW", label: "Cargo Worthy (CW)" },
  { value: "IICL", label: "IICL/Multi-Trip" },
  { value: "WWT", label: "Wind & Water Tight (WWT)" },
  { value: "OneTrip", label: "One-Trip / New" },
  { value: "AsIs", label: "As-Is" },
];

const GRADE_ALIASES = {
  cw: "CW",
  cargoworthy: "CW",
  iicl: "IICL",
  iiclcw: "IICL",
  iiclmultitrip: "IICL",
  iiclolder: "IICL",
  iiclnewer: "IICL",
  iiclnewermultitrip: "IICL",
  multitrip: "IICL",
  wwt: "WWT",
  windwatertight: "WWT",
  windandwatertight: "WWT",
  onetrip: "OneTrip",
  onetripnew: "OneTrip",
  new: "OneTrip",
  newbuild: "OneTrip",
  asis: "AsIs",
};

export function mapGrade(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (GRADES.some((g) => g.value === s)) return s;
  const n = s.toLowerCase().replace(/[\s\-_&/().]/g, "");
  if (GRADE_ALIASES[n]) return GRADE_ALIASES[n];
  if (n.includes("iicl") || n.includes("multitrip")) return "IICL";
  if (n.includes("onetrip")) return "OneTrip";
  if (n.includes("cargoworthy") || n === "cw") return "CW";
  if (n.includes("wwt") || n.includes("windwater")) return "WWT";
  if (n.includes("asis") || n === "as-is") return "AsIs";
  return "";
}

function compact(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[\s_\-]/g, "");
}

export function parseOfferSpec(raw) {
  const n = compact(raw);
  let size = "";
  if (n.includes("53")) size = "53";
  else if (n.includes("45")) size = "45";
  else if (n.includes("40")) size = "40";
  else if (n.includes("20")) size = "20";
  else if (n.includes("10")) size = "10";

  let height = "DC";
  if (
    n.includes("highcube") ||
    n.includes("40hc") ||
    n.includes("20hc") ||
    n.includes("45hc") ||
    n.includes("hq") ||
    /(^|[^a-z])hc([^a-z]|$)/.test(n)
  ) {
    height = "HC";
  }

  return { size, height, config: parseOfferConfig(raw) };
}

export function parseOfferConfig(raw) {
  const n = compact(raw);
  if (!n) return "standard";
  if (n.includes("tridoor") || n.includes("3door")) return "tri-door";
  if (n.includes("fullopen") || n.includes("opensidefull") || n.includes("fullopenside")) return "full-open-side";
  if (n.includes("opentop")) return "other";

  const openSide =
    n.includes("openside") ||
    n.includes("sidedoor") ||
    n.includes("os2d") ||
    n.includes("os4d") ||
    n.includes("os2door") ||
    n.includes("os4door") ||
    n.includes("hcos") ||
    /(^|[^a-z])os([^a-z]|$)/.test(n);

  if (openSide) {
    if (
      n.includes("os2d") ||
      n.includes("os2door") ||
      n.includes("openside2") ||
      n.includes("sidedoor2") ||
      n.includes("2doors") ||
      /(?:os|openside|sidedoor)2d/.test(n)
    ) {
      return "side-os-2d";
    }
    if (
      n.includes("os4d") ||
      n.includes("os4door") ||
      n.includes("openside4") ||
      n.includes("sidedoor4") ||
      n.includes("4doors") ||
      /(?:os|openside|sidedoor)4d/.test(n)
    ) {
      return "side-os-4d";
    }
    return "side-door";
  }

  if (n.includes("doubledoor") || n.includes("tunnel")) return "double-door";
  if (n.includes("reefer") || n.includes("refrigerat")) return "other";
  if (n.includes("specialized") || n.includes("modified") || n.includes("custom")) return "other";
  return "standard";
}

export function specsCompatible(want, got) {
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

export function rateSheetSize(size, config) {
  if (config && config !== "standard") return "Specialized";
  const n = String(size || "");
  if (n === "10" || n === "20") return "20ft";
  if (n === "40" || n === "45") return "40ft";
  if (n === "53") return "Specialized";
  return "40ft";
}

export function describeContainer(size, height, config, grade) {
  const sizeLabel = SIZES.find((s) => s.value === String(size))?.label || `${size} ft`;
  const heightLabel = height === "HC" ? "High Cube" : "Standard";
  const configLabel = CONFIGS.find((c) => c.value === config)?.label || "Standard";
  const gradeLabel = GRADES.find((g) => g.value === grade)?.label || grade || "";
  const bits = [sizeLabel, heightLabel];
  if (config && config !== "standard") bits.push(configLabel);
  if (gradeLabel) bits.push(gradeLabel);
  return bits.join(" ");
}

export function uniqueGrades(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values || []) {
    const mapped = mapGrade(raw);
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(GRADES.find((g) => g.value === mapped));
  }
  return out;
}

export function pickClosestDepot(depots) {
  const list = Array.isArray(depots) ? depots.filter((d) => d && d.name) : [];
  if (!list.length) return null;
  return list.slice().sort((a, b) => {
    if (a.miles == null && b.miles == null) return String(a.name).localeCompare(String(b.name));
    if (a.miles == null) return 1;
    if (b.miles == null) return -1;
    return a.miles - b.miles;
  })[0];
}

export function customerCashTotal(unitPrice, quantity = 1) {
  const sell = Number(unitPrice) || 0;
  const qty = Number(quantity) || 1;
  return Math.round(sell * qty * 100) / 100;
}

export const MIN_NET_MARGIN = 300;
export const MAX_NET_MARGIN = 2000;
export const DEFAULT_NET_MARGIN = 700;

export function clampNetMargin(raw) {
  const text = String(raw ?? "").replace(/[$,\s]/g, "");
  if (!text) return DEFAULT_NET_MARGIN;
  const n = Number(text);
  if (!Number.isFinite(n)) return DEFAULT_NET_MARGIN;
  const rounded = Math.round(n / 25) * 25;
  return Math.min(MAX_NET_MARGIN, Math.max(MIN_NET_MARGIN, rounded));
}

export const FULFILLMENT_DELIVER = "deliver";
export const FULFILLMENT_PICKUP = "pickup";

export function normalizeFulfillment(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "pickup" || t === "picked up" || t === "pick up" || t === "pick-up" || t === "customer pickup") {
    return FULFILLMENT_PICKUP;
  }
  return FULFILLMENT_DELIVER;
}

export function isPickupFulfillment(raw) {
  return normalizeFulfillment(raw) === FULFILLMENT_PICKUP;
}

export function fulfillmentHaul(fulfillment, delivery) {
  if (isPickupFulfillment(fulfillment)) return 0;
  const n = Number(delivery) || 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function deliveredCashFromPosted(wholesale, delivery, netMargin) {
  const cost = Number(wholesale);
  const haul = Number(delivery) || 0;
  if (!Number.isFinite(cost) || cost <= 0) return null;
  const margin = clampNetMargin(netMargin);
  return Math.ceil((cost + haul + margin) / 25) * 25;
}

export const CITY_HUBS = [
  { city: "Memphis", state: "TN", lat: 35.15, lon: -90.05, region: "Midwest" },
  { city: "Chicago", state: "IL", lat: 41.88, lon: -87.63, region: "Midwest" },
  { city: "Detroit", state: "MI", lat: 42.33, lon: -83.05, region: "Midwest" },
  { city: "Indianapolis", state: "IN", lat: 39.77, lon: -86.16, region: "Midwest" },
  { city: "St. Louis", state: "MO", lat: 38.63, lon: -90.20, region: "Midwest" },
  { city: "Kansas City", state: "MO", lat: 39.10, lon: -94.58, region: "Midwest" },
  { city: "Louisville", state: "KY", lat: 38.25, lon: -85.76, region: "Midwest" },
  { city: "Columbus", state: "OH", lat: 39.96, lon: -83.00, region: "Midwest" },
  { city: "Cleveland", state: "OH", lat: 41.50, lon: -81.69, region: "Midwest" },
  { city: "Atlanta", state: "GA", lat: 33.75, lon: -84.39, region: "East Coast" },
  { city: "Charlotte", state: "NC", lat: 35.23, lon: -80.84, region: "East Coast" },
  { city: "Charleston", state: "SC", lat: 32.78, lon: -79.93, region: "East Coast" },
  { city: "Savannah", state: "GA", lat: 32.08, lon: -81.09, region: "East Coast" },
  { city: "Jacksonville", state: "FL", lat: 30.33, lon: -81.66, region: "East Coast" },
  { city: "Miami", state: "FL", lat: 25.76, lon: -80.19, region: "East Coast" },
  { city: "Tampa", state: "FL", lat: 27.95, lon: -82.46, region: "East Coast" },
  { city: "Norfolk", state: "VA", lat: 36.85, lon: -76.29, region: "East Coast" },
  { city: "Baltimore", state: "MD", lat: 39.29, lon: -76.61, region: "East Coast" },
  { city: "Philadelphia", state: "PA", lat: 39.95, lon: -75.17, region: "East Coast" },
  { city: "Newark", state: "NJ", lat: 40.74, lon: -74.17, region: "East Coast" },
  { city: "New York", state: "NY", lat: 40.71, lon: -74.01, region: "East Coast" },
  { city: "Boston", state: "MA", lat: 42.36, lon: -71.06, region: "East Coast" },
  { city: "Wilmington", state: "NC", lat: 34.23, lon: -77.94, region: "East Coast" },
  { city: "Chesapeake", state: "VA", lat: 36.77, lon: -76.29, region: "East Coast" },
  { city: "Cincinnati", state: "OH", lat: 39.10, lon: -84.51, region: "Midwest" },
  { city: "Minneapolis", state: "MN", lat: 44.98, lon: -93.27, region: "Midwest" },
  { city: "Nashville", state: "TN", lat: 36.16, lon: -86.78, region: "Midwest" },
  { city: "Omaha", state: "NE", lat: 41.26, lon: -95.93, region: "Midwest" },
  { city: "Mobile", state: "AL", lat: 30.70, lon: -88.04, region: "East Coast" },
  { city: "New Orleans", state: "LA", lat: 29.95, lon: -90.07, region: "East Coast" },
  { city: "Houston", state: "TX", lat: 29.76, lon: -95.37, region: "West Coast" },
  { city: "Dallas", state: "TX", lat: 32.78, lon: -96.80, region: "West Coast" },
  { city: "San Antonio", state: "TX", lat: 29.42, lon: -98.49, region: "West Coast" },
  { city: "El Paso", state: "TX", lat: 31.76, lon: -106.49, region: "West Coast" },
  { city: "Los Angeles", state: "CA", lat: 34.05, lon: -118.24, region: "West Coast" },
  { city: "Long Beach", state: "CA", lat: 33.77, lon: -118.19, region: "West Coast" },
  { city: "Oakland", state: "CA", lat: 37.80, lon: -122.27, region: "West Coast" },
  { city: "San Francisco", state: "CA", lat: 37.77, lon: -122.42, region: "West Coast" },
  { city: "Bakersfield", state: "CA", lat: 35.37, lon: -119.02, region: "West Coast" },
  { city: "Seattle", state: "WA", lat: 47.61, lon: -122.33, region: "West Coast" },
  { city: "Tacoma", state: "WA", lat: 47.25, lon: -122.44, region: "West Coast" },
  { city: "Portland", state: "OR", lat: 45.52, lon: -122.68, region: "West Coast" },
  { city: "Phoenix", state: "AZ", lat: 33.45, lon: -112.07, region: "West Coast" },
  { city: "Denver", state: "CO", lat: 39.74, lon: -104.99, region: "West Coast" },
  { city: "Salt Lake City", state: "UT", lat: 40.76, lon: -111.89, region: "West Coast" },
];

const YARD_CITY_HINTS = [
  { test: /raines\s*road/i, city: "Memphis", state: "TN" },
  { test: /lanport/i, city: "Memphis", state: "TN" },
  { test: /mrs-?cmc/i, city: "Memphis", state: "TN" },
  { test: /san\s*pedro/i, city: "Long Beach", state: "CA" },
  { test: /port\s*newark|elizabeth\s*marine/i, city: "Newark", state: "NJ" },
];

function cleanPlace(raw) {
  return String(raw || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normPlace(raw) {
  return cleanPlace(raw).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function cityKey(city, state) {
  return `${normPlace(city)}|${normPlace(state)}`;
}

export function parseCityState(raw) {
  const s = cleanPlace(raw);
  const m = s.match(/^([^,]+),\s*([A-Za-z]{2})\s*$/);
  if (!m) return null;
  return { city: m[1].trim(), state: m[2].toUpperCase() };
}

export function aliasCityState(parsed) {
  if (!parsed || !parsed.city) return parsed;
  const c = normPlace(parsed.city);
  const st = String(parsed.state || "").toUpperCase();
  if (c === "saint louis" || c === "st louis") return { city: "St. Louis", state: "MO" };
  if (c === "kansas city") return { city: "Kansas City", state: "MO" };
  if (c === "minneapolis" || c.startsWith("minneapolis") || c === "saint paul" || c === "st paul") {
    return { city: "Minneapolis", state: "MN" };
  }
  if (c === "fort worth") return { city: "Dallas", state: "TX" };
  if (c === "jersey city" || c === "elizabeth") return { city: "Newark", state: "NJ" };
  if (c === "san pedro" || (c === "wilmington" && st === "CA")) return { city: "Long Beach", state: "CA" };
  if (c === "newport news" || c === "portsmouth" || c === "virginia beach") return { city: "Norfolk", state: "VA" };
  return parsed;
}

export function nearestCityHub(lat, lon, hubs = CITY_HUBS) {
  if (lat == null || lon == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
  let best = null;
  let bestMiles = Infinity;
  for (const h of hubs) {
    if (h.lat == null || h.lon == null) continue;
    const miles = haversineMiles(Number(lat), Number(lon), h.lat, h.lon);
    if (miles < bestMiles) {
      bestMiles = miles;
      best = h;
    }
  }
  return best;
}

export function findCityHub(text, hubs = CITY_HUBS) {
  const parsed = aliasCityState(parseCityState(text));
  if (parsed) {
    const hit = hubs.find((h) => cityKey(h.city, h.state) === cityKey(parsed.city, parsed.state));
    if (hit) return { ...hit };
    return { city: parsed.city, state: parsed.state, lat: null, lon: null, region: "" };
  }
  const n = cleanPlace(text).toLowerCase();
  if (!n) return null;
  for (const hint of YARD_CITY_HINTS) {
    if (hint.test.test(n)) {
      const hub = hubs.find((h) => cityKey(h.city, h.state) === cityKey(hint.city, hint.state));
      return hub ? { ...hub } : { city: hint.city, state: hint.state, lat: null, lon: null, region: "" };
    }
  }
  const sorted = hubs.slice().sort((a, b) => b.city.length - a.city.length);
  for (const h of sorted) {
    if (n.includes(h.city.toLowerCase())) return { ...h };
  }
  return null;
}

export function resolveOfferCity(offer, hubs = CITY_HUBS) {
  if (!offer) return null;
  return findCityHub(offer.location, hubs) || findCityHub(offer.city, hubs) || findCityHub(offer.depot, hubs);
}

export function displayCityState(depot) {
  if (!depot) return "";
  if (typeof depot === "string") {
    const h = findCityHub(depot);
    return h ? `${h.city}, ${h.state}` : "";
  }
  if (depot.displayLocation) return depot.displayLocation;
  if (depot.city && depot.state) return `${depot.city}, ${depot.state}`;
  const parsed = parseCityState(depot.location || depot.name || depot.depot);
  if (parsed) return `${parsed.city}, ${parsed.state}`;
  const h = findCityHub(depot.name || depot.depot || depot.location || depot.city);
  return h ? `${h.city}, ${h.state}` : "";
}

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function groupOffersByCity(offers, zipLat, zipLon, hubs = CITY_HUBS) {
  const byCity = new Map();
  for (const o of offers || []) {
    const q = o.qty == null || o.qty === "" ? null : Number(o.qty);
    if (q === 0) continue;
    const resolved = resolveOfferCity(o, hubs);
    if (!resolved) continue;
    const key = cityKey(resolved.city, resolved.state);
    const dlat = o.lat != null ? o.lat : resolved.lat;
    const dlon = o.lon != null ? o.lon : resolved.lon;
    let miles = null;
    if (dlat != null && dlon != null && zipLat != null && zipLon != null) {
      miles = Math.round(haversineMiles(zipLat, zipLon, dlat, dlon));
    }
    const yard = cleanPlace(o.depot);
    const existing = byCity.get(key);
    if (!existing) {
      const nearest = !resolved.region && dlat != null && dlon != null ? nearestCityHub(dlat, dlon, hubs) : null;
      byCity.set(key, {
        cityKey: key,
        city: resolved.city,
        state: resolved.state,
        name: `${resolved.city}, ${resolved.state}`,
        displayLocation: `${resolved.city}, ${resolved.state}`,
        lat: dlat,
        lon: dlon,
        region: resolved.region || (nearest && nearest.region) || "",
        miles,
        yards: yard ? [yard] : [],
        fromInventory: true,
      });
    } else {
      if (yard && !existing.yards.includes(yard)) existing.yards.push(yard);
      if (miles != null && (existing.miles == null || miles < existing.miles)) {
        existing.miles = miles;
        existing.lat = dlat;
        existing.lon = dlon;
      }
    }
  }
  return Array.from(byCity.values()).sort((a, b) => {
    if (a.miles == null && b.miles == null) return a.name.localeCompare(b.name);
    if (a.miles == null) return 1;
    if (b.miles == null) return -1;
    return a.miles - b.miles;
  });
}

function offerCost(o) {
  const v = o && (o.wholesaleCost != null ? o.wholesaleCost : o.wholesale != null ? o.wholesale : o.cost != null ? o.cost : o.price);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const MAX_POSTED_CITY_MILES = 800;

export function pickNearestPostedCity(offers, zipLat, zipLon, want, hubs = CITY_HUBS) {
  const cities = groupOffersByCity(offers, zipLat, zipLon, hubs);
  let nearest = cities[0] || null;
  for (const city of cities) {
    if (city.miles != null && city.miles > MAX_POSTED_CITY_MILES) continue;
    const offer = pickWholesaleOffer(offers, { ...want, cityKey: city.cityKey });
    if (offer) {
      return {
        city,
        offer,
        skipped: city === nearest ? null : nearest,
      };
    }
  }
  return { city: nearest, offer: null, skipped: null };
}

export function pickWholesaleOffer(offers, want) {
  const qty = Number(want && want.qty) || 1;
  const key = (want && want.cityKey) || "";
  if (!key) return null;
  const hits = (offers || [])
    .filter((o) => {
      const q = o.qty == null || o.qty === "" ? null : Number(o.qty);
      if (q === 0) return false;
      if (q != null && Number.isFinite(q) && q < qty) return false;
      if (!offerCost(o)) return false;
      const resolved = resolveOfferCity(o);
      const oKey = resolved ? cityKey(resolved.city, resolved.state) : "";
      if (oKey !== key) return false;
      const spec = parseOfferSpec(o.size || o.desc || o.type || "");
      if (!specsCompatible(want, spec)) return false;
      const grade = mapGrade(o.condition);
      if (want.grade && (!grade || grade !== want.grade)) return false;
      return true;
    })
    .sort((a, b) => offerCost(a) - offerCost(b));
  return hits[0] || null;
}

export function purchasingDepotLabel(offer, fallbackYards, fallbackCity) {
  const yard = offer ? cleanPlace(offer.depot) : "";
  if (yard) return yard;
  if (Array.isArray(fallbackYards) && fallbackYards.length) return fallbackYards.map(cleanPlace).filter(Boolean).join(" | ");
  return fallbackCity || "";
}

export function offerMatches(offer, want) {
  if (!offer) return false;
  if (offer.qty === 0) return false;
  const spec = parseOfferSpec(offer.size || "");
  if (!specsCompatible(want, spec)) return false;
  const grade = mapGrade(offer.condition);
  if (want.grade && (!grade || grade !== want.grade)) return false;
  if (want.cityKey) {
    const resolved = resolveOfferCity(offer);
    const oKey = resolved ? cityKey(resolved.city, resolved.state) : "";
    return oKey === want.cityKey;
  }
  return true;
}
