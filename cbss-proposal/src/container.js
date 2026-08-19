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
  { value: "side-door", label: "Side door" },
  { value: "full-open-side", label: "Full open side" },
  { value: "other", label: "Other / specialized" },
];

export const GRADES = [
  { value: "CW", label: "Cargo Worthy (CW)" },
  { value: "WWT", label: "Wind & Water Tight (WWT)" },
  { value: "OneTrip", label: "One-Trip / New" },
  { value: "AsIs", label: "As-Is" },
];

const GRADE_ALIASES = {
  cw: "CW",
  cargoworthy: "CW",
  iicl: "CW",
  iiclcw: "CW",
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
  const n = s.toLowerCase().replace(/[\s\-_&/]/g, "");
  if (GRADE_ALIASES[n]) return GRADE_ALIASES[n];
  if (n.includes("onetrip")) return "OneTrip";
  if (n.includes("cargoworthy") || n === "cw" || n.includes("iicl")) return "CW";
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

  let config = "standard";
  if (n.includes("tridoor") || n.includes("3door")) config = "tri-door";
  else if (n.includes("doubledoor") || n.includes("tunnel")) config = "double-door";
  else if (n.includes("fullopen") || n.includes("openside")) config = "full-open-side";
  else if (n.includes("sidedoor")) config = "side-door";
  else if (n.includes("specialized") || n.includes("modified") || n.includes("custom")) config = "other";

  return { size, height, config };
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

export function offerMatches(offer, want) {
  if (!offer) return false;
  if (offer.qty === 0) return false;
  const spec = parseOfferSpec(offer.size || "");
  if (want.size && spec.size && spec.size !== String(want.size)) return false;
  if (want.height && spec.height && spec.height !== want.height) return false;
  if (want.config && want.config !== "standard" && spec.config && spec.config !== want.config) return false;
  const grade = mapGrade(offer.condition);
  if (want.grade && grade && grade !== want.grade) return false;
  if (want.depot && offer.depot && offer.depot !== want.depot) return false;
  return true;
}
