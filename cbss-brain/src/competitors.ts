const C1_URLS = [
  "https://container-one.myshopify.com/apps/migraton/controller.php",
  "https://containerone.net/apps/migraton/controller.php",
];
const C1_SHOP = "container-one.myshopify.com";
const C1_ACTION = "both_google_location_high_charges_pricing_zipcode_for_product";
const CACHE_MS = 10 * 60 * 1000;
const FETCH_MS = 12000;

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;
const C1_INTENT =
  /\b(container\s*one|containerone|competitor(?:\s+price)?s?|their\s+price|what\s+are\s+they)\b/i;

export const ASK_FOR_ZIP =
  "Type the client ZIP and pick the size, grade, and configuration. I will pull that one Container One posted price — not a CBSS quote.";

export const ASK_FOR_PICK =
  "Pick the size, grade, and configuration, then pull. I will only post that one Container One figure — not a CBSS quote.";

export const PULL_FAILED =
  "Could not pull Container One just now. Open containerone.net, enter the client ZIP, and read their posted depot and price. Do not invent a number.";

type CoreCode =
  | "20STWWT"
  | "20STCW"
  | "20STUSED"
  | "20STMT"
  | "20ST1TRIP"
  | "20STDD1TRIP"
  | "20STSD1TRIP"
  | "40STWWT"
  | "40STCW"
  | "40STUSED"
  | "40ST1TRIP"
  | "40HCWWT"
  | "40HCCW"
  | "40HCUSED"
  | "40HCMT"
  | "40HC1TRIP"
  | "40HCDD1TRIP"
  | "40HCSD1TRIP"
  | "20STRFW"
  | "20STRFNW"
  | "40STRFW"
  | "40STRFNW"
  | "40HCRFW"
  | "40HCRFNW";

const CORE: Record<CoreCode, { size: string; grade: string; config: string; order: number }> = {
  "20STWWT": { size: "20STD", grade: "WWT", config: "Standard", order: 10 },
  "20STCW": { size: "20STD", grade: "CW", config: "Standard", order: 11 },
  "20STUSED": { size: "20STD", grade: "Economy", config: "Standard", order: 12 },
  "20STMT": { size: "20STD", grade: "Multi-Trip", config: "Standard", order: 13 },
  "20ST1TRIP": { size: "20STD", grade: "One-Trip", config: "Standard", order: 14 },
  "20STDD1TRIP": { size: "20STD", grade: "One-Trip", config: "Double door", order: 15 },
  "20STSD1TRIP": { size: "20STD", grade: "One-Trip", config: "Side door", order: 16 },
  "20STRFW": { size: "20STD", grade: "Reefer", config: "Reefer working", order: 17 },
  "20STRFNW": { size: "20STD", grade: "Reefer", config: "Reefer non-working", order: 18 },
  "40STWWT": { size: "40STD", grade: "WWT", config: "Standard", order: 20 },
  "40STCW": { size: "40STD", grade: "CW", config: "Standard", order: 21 },
  "40STUSED": { size: "40STD", grade: "Economy", config: "Standard", order: 22 },
  "40ST1TRIP": { size: "40STD", grade: "One-Trip", config: "Standard", order: 23 },
  "40STRFW": { size: "40STD", grade: "Reefer", config: "Reefer working", order: 24 },
  "40STRFNW": { size: "40STD", grade: "Reefer", config: "Reefer non-working", order: 25 },
  "40HCWWT": { size: "40HC", grade: "WWT", config: "Standard", order: 30 },
  "40HCCW": { size: "40HC", grade: "CW", config: "Standard", order: 31 },
  "40HCUSED": { size: "40HC", grade: "Economy", config: "Standard", order: 32 },
  "40HCMT": { size: "40HC", grade: "Multi-Trip", config: "Standard", order: 33 },
  "40HC1TRIP": { size: "40HC", grade: "One-Trip", config: "Standard", order: 34 },
  "40HCDD1TRIP": { size: "40HC", grade: "One-Trip", config: "Double door", order: 35 },
  "40HCSD1TRIP": { size: "40HC", grade: "One-Trip", config: "Side door", order: 36 },
  "40HCRFW": { size: "40HC", grade: "Reefer", config: "Reefer working", order: 37 },
  "40HCRFNW": { size: "40HC", grade: "Reefer", config: "Reefer non-working", order: 38 },
};

const CORE_CODES = Object.keys(CORE) as CoreCode[];

export type CompetitorPick = {
  size: string;
  grade: string;
  config: string;
};

export type CompetitorLine = {
  code: CoreCode;
  size: string;
  grade: string;
  config: string;
  delivered: number;
  pickup: number;
  depot: string;
  miles: number | null;
};

export type CompetitorPull = {
  vendor: "container-one";
  zip: string;
  cityState: string;
  pulledAt: string;
  lines: CompetitorLine[];
};

type CacheRow = { at: number; pull: CompetitorPull };

const cache = new Map<string, CacheRow>();
let lastPullAt = 0;

export function normalizeZip(raw: string): string {
  const match = String(raw || "").match(ZIP_RE);
  return match ? match[1] : "";
}

export function wantsContainerOne(text: string): boolean {
  return C1_INTENT.test(String(text || ""));
}

export function parseCompetitorPick(text: string): Partial<CompetitorPick> {
  const src = String(text || "");
  const pick: Partial<CompetitorPick> = {};
  if (/\b40\s*(?:ft\s*)?(?:hc|high\s*cube)\b/i.test(src) || /\b40hc\b/i.test(src)) pick.size = "40HC";
  else if (/\b40\s*(?:ft\s*)?(?:std|standard)\b/i.test(src) || /\b40std\b/i.test(src)) pick.size = "40STD";
  else if (/\b20\s*(?:ft\s*)?(?:hc|high\s*cube)\b/i.test(src) || /\b20hc\b/i.test(src)) pick.size = "20HC";
  else if (/\b20\s*(?:ft\s*)?(?:std|standard)\b/i.test(src) || /\b20std\b/i.test(src) || /\b20'\b/i.test(src)) {
    pick.size = "20STD";
  }
  if (/\b(?:wwt|wind\s*(?:and|&)\s*water)\b/i.test(src)) pick.grade = "WWT";
  else if (/\b(?:multi[-\s]?trip)\b/i.test(src)) pick.grade = "Multi-Trip";
  else if (/\b(?:one[-\s]?trip|1[-\s]?trip)\b/i.test(src)) pick.grade = "One-Trip";
  else if (/\b(?:economy|as[-\s]?is)\b/i.test(src)) pick.grade = "Economy";
  else if (/\b(?:cargo\s*worthy|\bcw\b)/i.test(src)) pick.grade = "CW";
  if (/\bdouble\s*door\b/i.test(src)) pick.config = "Double door";
  else if (/\bside\s*door\b/i.test(src)) pick.config = "Side door";
  else if (/\breefer\b/i.test(src)) {
    pick.grade = "Reefer";
    pick.config = /\bnon[-\s]?working\b|\bnw\b/i.test(src) ? "Reefer non-working" : "Reefer working";
  } else if (pick.size && pick.grade) pick.config = "Standard";
  return pick;
}

export function isReeferConfig(config: string): boolean {
  return /^Reefer /i.test(String(config || ""));
}

export function completePick(raw: Partial<CompetitorPick> | null | undefined): CompetitorPick | null {
  const size = String(raw?.size || "").trim();
  const config = String(raw?.config || "").trim() || "Standard";
  const grade = isReeferConfig(config) ? "Reefer" : String(raw?.grade || "").trim();
  if (!size || !grade) return null;
  return { size, grade, config };
}

export function detectCompetitorPull(
  message: string,
  history: Array<{ role?: string; content?: string }> = [],
):
  | { vendor: "container-one"; needZip: true }
  | { vendor: "container-one"; zip: string; needPick: true }
  | { vendor: "container-one"; zip: string; pick: CompetitorPick }
  | null {
  const text = String(message || "").trim();
  if (!text) return null;
  const zip = normalizeZip(text);
  const pick = completePick(parseCompetitorPick(text));
  if (wantsContainerOne(text)) {
    if (!zip) return { vendor: "container-one", needZip: true };
    if (!pick) return { vendor: "container-one", zip, needPick: true };
    return { vendor: "container-one", zip, pick };
  }
  const last = [...history].reverse().find((m) => m && m.role === "assistant");
  const asked = String(last?.content || "").includes("Type the client ZIP");
  if (asked && zip && /^\d{5}(?:-\d{4})?$/.test(text.replace(/\s+/g, ""))) {
    return { vendor: "container-one", zip, needPick: true };
  }
  return null;
}

export function coreCodeFromTitle(title: string, handle = ""): CoreCode | "" {
  const blob = `${title} ${handle}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/BLUE/.test(blob)) return "";
  const hits = CORE_CODES.filter((code) => blob.includes(code));
  if (!hits.length) return "";
  hits.sort((a, b) => b.length - a.length);
  return hits[0];
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function productRows(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw === 0 || raw === 2) return [];
  const out: Record<string, unknown>[] = [];
  for (const [key, item] of Object.entries(raw as Record<string, unknown>)) {
    if (key === "location" || key === "city_state") continue;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    out.push(item as Record<string, unknown>);
  }
  return out;
}

export function parseContainerOne(raw: unknown, zip: string, now = new Date()): CompetitorPull | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const products = rec.products;
  const rows = productRows(products);
  if (!rows.length) return null;
  const cityState =
    str((products as Record<string, unknown>)?.city_state) ||
    str(rec.city_state);
  const seen = new Map<CoreCode, CompetitorLine>();
  for (const row of rows) {
    const code = coreCodeFromTitle(str(row.sp_title), str(row.sp_handle));
    if (!code) continue;
    const delivered = num(row.final_price);
    if (delivered < 50) continue;
    const meta = CORE[code];
    const depot = [str(row.city), str(row.state_code)].filter(Boolean).join(", ");
    const miles = num(row.distance);
    seen.set(code, {
      code,
      size: meta.size,
      grade: meta.grade,
      config: meta.config,
      delivered,
      pickup: num(row.final_container_customer_pickup_price),
      depot,
      miles: miles > 0 ? miles : miles === 0 ? 0 : null,
    });
  }
  const lines = [...seen.values()].sort((a, b) => CORE[a.code].order - CORE[b.code].order);
  if (!lines.length) return null;
  return {
    vendor: "container-one",
    zip,
    cityState,
    pulledAt: now.toISOString(),
    lines,
  };
}

export function applyCompetitorPick(pull: CompetitorPull, pick: CompetitorPick): CompetitorPull {
  const lines = pull.lines.filter((line) => {
    if (line.size !== pick.size) return false;
    if (isReeferConfig(pick.config)) return line.config === pick.config;
    return line.grade === pick.grade && line.config === pick.config;
  });
  return { ...pull, lines };
}

function boxLabel(size: string, grade: string, config: string): string {
  if (isReeferConfig(config)) return `${size} · ${config}`;
  return `${size} ${grade} · ${config}`;
}

export function missingCombo(zip: string, pick: CompetitorPick): string {
  return `Container One did not post a ${boxLabel(pick.size, pick.grade, pick.config)} for ZIP ${zip}. Try another grade or configuration, or check containerone.net. Do not invent a number.`;
}

export function formatCompetitorCard(pull: CompetitorPull): string {
  const when = pull.pulledAt.replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const where = pull.cityState ? `They resolved the ZIP as ${pull.cityState}.` : "";
  const rows = pull.lines.map((line) => {
    const depot = line.depot || "depot not posted";
    const miles = line.miles == null ? "" : ` · ${line.miles} mi`;
    const pickup = line.pickup >= 50 ? `  pickup ${money(line.pickup)}` : "";
    return `${boxLabel(line.size, line.grade, line.config)}  ${money(line.delivered)} delivered  ${depot}${miles}${pickup}`;
  });
  return [
    "CONTAINER ONE — posted live (not a CBSS price)",
    `ZIP ${pull.zip}. ${where}`.trim(),
    `Pulled from their public ZIP widget ${when}. Confirm on containerone.net if the number matters.`,
    "",
    ...rows,
    "",
    "That is their posted figure. Do not read it as our quote. Text Christopher at 870-323-2593 for a CBSS number.",
  ].join("\n");
}

export function competitorAmounts(pull: CompetitorPull): string {
  return pull.lines
    .flatMap((line) => [`$${line.delivered}`, line.pickup >= 50 ? `$${line.pickup}` : ""])
    .filter(Boolean)
    .join(" ");
}

export async function pullContainerOne(
  zipRaw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; pull: CompetitorPull; card: string } | { ok: false; error: string }> {
  const zip = normalizeZip(zipRaw);
  if (!zip) return { ok: false, error: ASK_FOR_ZIP };

  const hit = cache.get(zip);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { ok: true, pull: hit.pull, card: formatCompetitorCard(hit.pull) };
  }

  const wait = Date.now() - lastPullAt;
  if (lastPullAt && wait < 1500) {
    await new Promise((resolve) => setTimeout(resolve, 1500 - wait));
  }

  const body = new URLSearchParams({
    action: C1_ACTION,
    zip_code: zip,
    shop: C1_SHOP,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  lastPullAt = Date.now();
  try {
    let lastStatus = 0;
    for (const url of C1_URLS) {
      const res = await fetchImpl(url, {
        method: "POST",
        redirect: "manual",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        body: body.toString(),
        signal: ctrl.signal,
      });
      lastStatus = res.status;
      if (res.status >= 300 && res.status < 400) {
        console.error("c1_pull_redirect", url, res.status);
        continue;
      }
      const rawText = await res.text();
      if (!res.ok) {
        console.error("c1_pull_http", url, res.status, rawText.slice(0, 160));
        continue;
      }
      let payload: unknown = null;
      try {
        payload = JSON.parse(rawText);
      } catch {
        console.error("c1_pull_not_json", url, res.status, rawText.slice(0, 160));
        continue;
      }
      const parsed = parseContainerOne(payload, zip);
      if (!parsed) {
        console.error("c1_pull_empty", zip, url);
        return {
          ok: false,
          error:
            "Container One did not post a delivered price for that ZIP. Their page may want a custom quote. Open containerone.net and check, or text Christopher at 870-323-2593.",
        };
      }
      cache.set(zip, { at: Date.now(), pull: parsed });
      return { ok: true, pull: parsed, card: formatCompetitorCard(parsed) };
    }
    console.error("c1_pull_exhausted", lastStatus);
    return { ok: false, error: PULL_FAILED };
  } catch (err) {
    console.error("c1_pull_error", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: PULL_FAILED };
  } finally {
    clearTimeout(timer);
  }
}

export async function answerCompetitorPull(
  zipRaw: string,
  pickRaw: Partial<CompetitorPick> | null,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; pull: CompetitorPull; card: string } | { ok: false; error: string }> {
  const pick = completePick(pickRaw);
  if (!pick) return { ok: false, error: ASK_FOR_PICK };
  const result = await pullContainerOne(zipRaw, fetchImpl);
  if (!result.ok) return result;
  const filtered = applyCompetitorPick(result.pull, pick);
  if (!filtered.lines.length) return { ok: false, error: missingCombo(result.pull.zip, pick) };
  return { ok: true, pull: filtered, card: formatCompetitorCard(filtered) };
}
