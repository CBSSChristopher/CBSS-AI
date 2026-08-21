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
const CORE_CODES = Object.keys(CORE);

function normalizeZip(raw) {
  const match = String(raw || "").match(ZIP_RE);
  return match ? match[1] : "";
}
function parseCompetitorPick(text) {
  const srcText = String(text || "");
  const pick = {};
  if (/\b40\s*(?:ft\s*)?(?:hc|high\s*cube)\b/i.test(srcText) || /\b40hc\b/i.test(srcText)) pick.size = "40HC";
  else if (/\b40\s*(?:ft\s*)?(?:std|standard)\b/i.test(srcText) || /\b40std\b/i.test(srcText)) pick.size = "40STD";
  else if (/\b20\s*(?:ft\s*)?(?:std|standard)\b/i.test(srcText) || /\b20std\b/i.test(srcText)) pick.size = "20STD";
  if (/\b(?:wwt|wind\s*(?:and|&)\s*water)\b/i.test(srcText)) pick.grade = "WWT";
  else if (/\b(?:multi[-\s]?trip)\b/i.test(srcText)) pick.grade = "Multi-Trip";
  else if (/\b(?:one[-\s]?trip|1[-\s]?trip)\b/i.test(srcText)) pick.grade = "One-Trip";
  else if (/\b(?:economy|as[-\s]?is)\b/i.test(srcText)) pick.grade = "Economy";
  else if (/\b(?:cargo\s*worthy|\bcw\b)/i.test(srcText)) pick.grade = "CW";
  if (/\bdouble\s*door\b/i.test(srcText)) pick.config = "Double door";
  else if (/\bside\s*door\b/i.test(srcText)) pick.config = "Side door";
  else if (/\breefer\b/i.test(srcText)) {
    pick.grade = "Reefer";
    pick.config = /\bnon[-\s]?working\b|\bnw\b/i.test(srcText) ? "Reefer non-working" : "Reefer working";
  } else if (pick.size && pick.grade) pick.config = "Standard";
  return pick;
}
function isReeferConfig(config) {
  return /^Reefer /i.test(String(config || ""));
}
function completePick(raw) {
  const size = String(raw?.size || "").trim();
  const config = String(raw?.config || "").trim() || "Standard";
  const grade = isReeferConfig(config) ? "Reefer" : String(raw?.grade || "").trim();
  if (!size || !grade) return null;
  return { size, grade, config };
}
function detectCompetitorPull(message, history = []) {
  const text = String(message || "").trim();
  if (!text) return null;
  const zip = normalizeZip(text);
  const pick = completePick(parseCompetitorPick(text));
  if (C1_INTENT.test(text)) {
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
function coreCodeFromTitle(title, handle = "") {
  const blob = `${title} ${handle}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/BLUE/.test(blob)) return "";
  const hits = CORE_CODES.filter((code) => blob.includes(code));
  if (!hits.length) return "";
  hits.sort((a, b) => b.length - a.length);
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
  if (!products || typeof products !== "object") return null;
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
      config: CORE[code].config,
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
function applyCompetitorPick(pull, pick) {
  return {
    ...pull,
    lines: pull.lines.filter((line) => {
      if (line.size !== pick.size) return false;
      if (isReeferConfig(pick.config)) return line.config === pick.config;
      return line.grade === pick.grade && line.config === pick.config;
    }),
  };
}
function formatCompetitorCard(pull) {
  const rows = pull.lines.map((line) => {
    const miles = line.miles == null ? "" : ` · ${line.miles} mi`;
    const label = isReeferConfig(line.config) ? `${line.size} · ${line.config}` : `${line.size} ${line.grade} · ${line.config}`;
    return `${label}  $${Math.round(line.delivered).toLocaleString("en-US")} delivered  ${line.depot}${miles}`;
  });
  return [
    "CONTAINER ONE — posted live (not a CBSS price)",
    `ZIP ${pull.zip}. They resolved the ZIP as ${pull.cityState}.`,
    ...rows,
    "That is their posted figure. Do not read it as our quote.",
  ].join("\n");
}

describe("Container One live pull", () => {
  it("uses their public ZIP widget only and asks for size, grade, and configuration", () => {
    assert.match(src, /container-one\.myshopify\.com\/apps\/migraton\/controller\.php/);
    assert.match(src, /applyCompetitorPick|answerCompetitorPull/);
    assert.match(src, /not a CBSS price/);
    assert.match(brain, /pick size, grade, and configuration/);
    assert.match(index, /answerCompetitorPull/);
    assert.match(page, /data-pick="size"/);
    assert.match(page, /data-pick="grade"/);
    assert.match(page, /data-pick="config"/);
    assert.match(page, /Double door/);
    assert.match(page, /Reefer working/);
    assert.match(page, /Reefer non-working/);
    assert.match(page, /Pull Container One/);
    assert.match(src, /20STRFW/);
    assert.match(page, /build 8/);
    assert.doesNotMatch(src, /xChange/);
  });

  it("detects a ZIP plus a picked box, and asks when the pick is missing", () => {
    assert.deepEqual(detectCompetitorPull("Pull Container One for ZIP 85001 — 40HC CW Standard"), {
      vendor: "container-one",
      zip: "85001",
      pick: { size: "40HC", grade: "CW", config: "Standard" },
    });
    assert.deepEqual(detectCompetitorPull("what are they charging for a 40HC CW in 72201"), {
      vendor: "container-one",
      zip: "72201",
      pick: { size: "40HC", grade: "CW", config: "Standard" },
    });
    assert.deepEqual(detectCompetitorPull("Pull Container One for ZIP 85001"), {
      vendor: "container-one",
      zip: "85001",
      needPick: true,
    });
    assert.deepEqual(detectCompetitorPull("container one"), {
      vendor: "container-one",
      needZip: true,
    });
    assert.equal(detectCompetitorPull("Write a CRM note for ZIP 85001"), null);
    assert.deepEqual(detectCompetitorPull("Pull Container One for ZIP 85001 — 20STD CW Reefer working"), {
      vendor: "container-one",
      zip: "85001",
      pick: { size: "20STD", grade: "Reefer", config: "Reefer working" },
    });
  });

  it("posts only the picked size, grade, and configuration", () => {
    const pull = parseContainerOne(fixture, "85001");
    assert.ok(pull);
    const one = applyCompetitorPick(pull, { size: "40HC", grade: "CW", config: "Standard" });
    assert.equal(one.lines.length, 1);
    assert.equal(one.lines[0].delivered, 3949);
    assert.equal(one.lines[0].depot, "Phoenix, AZ");
    const card = formatCompetitorCard(one);
    assert.match(card, /40HC CW · Standard {2}\$3,949 delivered {2}Phoenix, AZ/);
    assert.doesNotMatch(card, /20STD|\$2,677|11,539|6,769/);
    const dd = applyCompetitorPick(pull, { size: "40HC", grade: "One-Trip", config: "Double door" });
    assert.equal(dd.lines[0].delivered, 6875);
    assert.equal(dd.lines[0].depot, "El Paso, TX");
    const miss = applyCompetitorPick(pull, { size: "40HC", grade: "WWT", config: "Side door" });
    assert.equal(miss.lines.length, 0);
    const rf = applyCompetitorPick(pull, { size: "20STD", grade: "Reefer", config: "Reefer working" });
    assert.equal(rf.lines[0].delivered, 11539);
    assert.equal(rf.lines[0].depot, "Los Angeles, CA");
    assert.match(formatCompetitorCard(rf), /20STD · Reefer working {2}\$11,539 delivered {2}Los Angeles, CA/);
    const nw = applyCompetitorPick(pull, { size: "40HC", grade: "Reefer", config: "Reefer non-working" });
    assert.equal(nw.lines[0].delivered, 8677);
    assert.equal(coreCodeFromTitle("40ft High Cube 1 Trip Blue Shipping Container (40HC1TRIPBLUE)"), "");
  });
});
