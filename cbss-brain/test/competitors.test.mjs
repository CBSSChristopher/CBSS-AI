import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/competitors.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const brain = readFileSync(new URL("../src/brain.ts", import.meta.url), "utf8");
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/container-one-85001.json", import.meta.url), "utf8"),
);

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;
const C1_INTENT =
  /\b(container\s*one|containerone|competitor(?:\s+price)?s?|their\s+price|what\s+are\s+they)\b/i;
const CORE = {
  "20STWWT": { size: "20STD", grade: "WWT", order: 10 },
  "20STCW": { size: "20STD", grade: "CW", order: 11 },
  "20STUSED": { size: "20STD", grade: "Economy", order: 12 },
  "20STMT": { size: "20STD", grade: "Multi-Trip", order: 13 },
  "20ST1TRIP": { size: "20STD", grade: "One-Trip", order: 14 },
  "40STWWT": { size: "40STD", grade: "WWT", order: 20 },
  "40STCW": { size: "40STD", grade: "CW", order: 21 },
  "40STUSED": { size: "40STD", grade: "Economy", order: 22 },
  "40ST1TRIP": { size: "40STD", grade: "One-Trip", order: 23 },
  "40HCWWT": { size: "40HC", grade: "WWT", order: 30 },
  "40HCCW": { size: "40HC", grade: "CW", order: 31 },
  "40HCUSED": { size: "40HC", grade: "Economy", order: 32 },
  "40HCMT": { size: "40HC", grade: "Multi-Trip", order: 33 },
  "40HC1TRIP": { size: "40HC", grade: "One-Trip", order: 34 },
};
const CORE_CODES = Object.keys(CORE);

function normalizeZip(raw) {
  const match = String(raw || "").match(ZIP_RE);
  return match ? match[1] : "";
}
function wantsContainerOne(text) {
  return C1_INTENT.test(String(text || ""));
}
function detectCompetitorPull(message, history = []) {
  const text = String(message || "").trim();
  if (!text) return null;
  const zip = normalizeZip(text);
  if (wantsContainerOne(text)) {
    return zip ? { vendor: "container-one", zip } : { vendor: "container-one", needZip: true };
  }
  const last = [...history].reverse().find((m) => m && m.role === "assistant");
  const asked = String(last?.content || "").includes("Type the client ZIP");
  if (asked && zip && /^\d{5}(?:-\d{4})?$/.test(text.replace(/\s+/g, ""))) {
    return { vendor: "container-one", zip };
  }
  return null;
}
function coreCodeFromTitle(title, handle = "") {
  const blob = `${title} ${handle}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hits = CORE_CODES.filter((code) => blob.includes(code));
  if (!hits.length) return "";
  hits.sort((a, b) => b.length - a.length);
  if (hits[0] === "40HC1TRIP" && /BLUE/.test(blob)) return "";
  return hits[0];
}
function num(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}
function parseContainerOne(raw, zip) {
  if (!raw || typeof raw !== "object") return null;
  const products = raw.products;
  if (!products || typeof products !== "object" || products === 0 || products === 2) return null;
  const seen = new Map();
  for (const [key, row] of Object.entries(products)) {
    if (key === "location" || key === "city_state") continue;
    if (!row || typeof row !== "object") continue;
    const code = coreCodeFromTitle(str(row.sp_title), str(row.sp_handle));
    if (!code) continue;
    const delivered = num(row.final_price);
    if (delivered < 50) continue;
    seen.set(code, {
      code,
      size: CORE[code].size,
      grade: CORE[code].grade,
      delivered,
      pickup: num(row.final_container_customer_pickup_price),
      depot: [str(row.city), str(row.state_code)].filter(Boolean).join(", "),
      miles: num(row.distance),
    });
  }
  const lines = [...seen.values()].sort((a, b) => CORE[a.code].order - CORE[b.code].order);
  if (!lines.length) return null;
  return { vendor: "container-one", zip, cityState: str(products.city_state), lines };
}
function formatCompetitorCard(pull) {
  const rows = pull.lines.map((line) => {
    const miles = line.miles == null ? "" : ` · ${line.miles} mi`;
    return `${line.size} ${line.grade}  $${Math.round(line.delivered).toLocaleString("en-US")} delivered  ${line.depot}${miles}`;
  });
  return [
    "CONTAINER ONE — posted live (not a CBSS price)",
    `ZIP ${pull.zip}. They resolved the ZIP as ${pull.cityState}.`,
    ...rows,
    "These are their all-in delivered figures as posted. Do not read them as our quote.",
  ].join("\n");
}

describe("Container One live pull", () => {
  it("uses their public ZIP widget only and labels the numbers as theirs", () => {
    assert.match(src, /container-one\.myshopify\.com\/apps\/migraton\/controller\.php/);
    assert.match(src, /containerone\.net\/apps\/migraton\/controller\.php/);
    assert.match(src, /both_google_location_high_charges_pricing_zipcode_for_product/);
    assert.match(src, /not a CBSS price/);
    assert.match(src, /Confirm on containerone\.net/);
    assert.match(brain, /COMPETITOR CHECK ON A LIVE CALL/);
    assert.match(brain, /Never invent a competitor price/);
    assert.match(index, /\/comp\/container-one/);
    assert.match(index, /detectCompetitorPull/);
    assert.match(page, /Pull Container One/);
    assert.match(page, /comp-zip/);
    assert.match(page, /build 6/);
    assert.doesNotMatch(src, /xChange/);
  });

  it("detects a ZIP plus Container One, and asks for ZIP when missing", () => {
    assert.deepEqual(detectCompetitorPull("Pull Container One for ZIP 85001"), {
      vendor: "container-one",
      zip: "85001",
    });
    assert.deepEqual(detectCompetitorPull("what are they charging in 72201"), {
      vendor: "container-one",
      zip: "72201",
    });
    assert.deepEqual(detectCompetitorPull("container one"), {
      vendor: "container-one",
      needZip: true,
    });
    assert.equal(detectCompetitorPull("Write a CRM note for ZIP 85001"), null);
    assert.deepEqual(
      detectCompetitorPull("85001", [{ role: "assistant", content: "Type the client ZIP and I will pull Container One" }]),
      { vendor: "container-one", zip: "85001" },
    );
  });

  it("maps their posted boxes to depot + delivered price and skips specialty units", () => {
    const pull = parseContainerOne(fixture, "85001");
    assert.ok(pull);
    assert.equal(pull.cityState, "Phoenix, AZ 85001, USA");
    const byCode = Object.fromEntries(pull.lines.map((l) => [l.code, l]));
    assert.equal(byCode["20STWWT"].delivered, 2677);
    assert.equal(byCode["20STWWT"].depot, "Phoenix, AZ");
    assert.equal(byCode["20STCW"].delivered, 3270);
    assert.equal(byCode["40STWWT"].delivered, 3419);
    assert.equal(byCode["40HCWWT"].delivered, 3551);
    assert.equal(byCode["40HC1TRIP"].delivered, 5274);
    assert.equal(byCode["20STRFW"], undefined);
    assert.equal(
      pull.lines.some((l) => l.depot === "Los Angeles, CA" && l.code === "40HC1TRIP"),
      false,
    );
    const card = formatCompetitorCard(pull);
    assert.match(card, /not a CBSS price/);
    assert.match(card, /20STD WWT {2}\$2,677 delivered {2}Phoenix, AZ/);
    assert.match(card, /40HC CW {2}\$3,949 delivered/);
    assert.doesNotMatch(card, /11539|11,539/);
  });
});
