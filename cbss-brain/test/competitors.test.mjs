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
const usaFixture = JSON.parse(
  readFileSync(new URL("./fixtures/usa-containers-85001.json", import.meta.url), "utf8"),
);

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;
const C1_INTENT =
  /\b(container\s*one|containerone|competitor(?:\s+price)?s?|their\s+price|what\s+are\s+they)\b/i;
const USAC_INTENT = /\b(usa\s*containers?|usacontainers)\b/i;
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
  else if (/\b20\s*(?:ft\s*)?(?:hc|high\s*cube)\b/i.test(srcText) || /\b20hc\b/i.test(srcText)) pick.size = "20HC";
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
  const named = USAC_INTENT.test(text) ? "usa-containers" : C1_INTENT.test(text) ? "container-one" : "";
  if (named) {
    if (!zip) return { vendor: named, needZip: true };
    if (!pick) return { vendor: named, zip, needPick: true };
    return { vendor: named, zip, pick };
  }
  const last = [...history].reverse().find((m) => m && m.role === "assistant");
  const asked = String(last?.content || "");
  if (asked.includes("Type the client ZIP") && zip && /^\d{5}(?:-\d{4})?$/.test(text.replace(/\s+/g, ""))) {
    const vendor = /USA Containers/i.test(asked) ? "usa-containers" : "container-one";
    return { vendor, zip, needPick: true };
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
      const gradeOk = line.grade === pick.grade || (line.grade === "WWT/CW" && (pick.grade === "WWT" || pick.grade === "CW"));
      return gradeOk && line.config === pick.config;
    }),
  };
}

function usaSpecToPick(name) {
  const title = String(name || "");
  if (!title) return null;
  if (/\b10'|open\s*side/i.test(title)) return null;
  let size = "";
  if (/40'\s*.*high\s*cube/i.test(title)) size = "40HC";
  else if (/20'\s*.*high\s*cube/i.test(title)) size = "20HC";
  else if (/40'/.test(title) && /standard/i.test(title)) size = "40STD";
  else if (/20'/.test(title) && /standard/i.test(title)) size = "20STD";
  else return null;
  let config = "Standard";
  if (/double\s*door/i.test(title)) config = "Double door";
  else if (/side\s*doors?/i.test(title)) config = "Side door";
  let grade = "";
  if (/one[-\s]?trip/i.test(title)) grade = "One-Trip";
  else if (/as\s*is/i.test(title)) grade = "Economy";
  else if (/wwt\s*\/\s*cw|wwt\/cw/i.test(title)) grade = "WWT/CW";
  else return null;
  return { size, grade, config };
}

function parseUsaContainers(raw, zip, pickupRaw = null) {
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.delivery) ? raw.delivery : [];
  const pickupRows = Array.isArray(pickupRaw) ? pickupRaw : Array.isArray(raw?.pickup) ? raw.pickup : [];
  const pickupByName = new Map();
  for (const row of pickupRows) {
    const name = String(row.specDisplayName || "");
    const total = Number(row.cheapestOption?.totalPrice);
    if (name && Number.isFinite(total) && total >= 50) pickupByName.set(name, total);
  }
  const lines = [];
  for (const row of rows) {
    const name = String(row.specDisplayName || "");
    const mapped = usaSpecToPick(name);
    const delivered = Number(row.cheapestOption?.totalPrice);
    if (!mapped || !Number.isFinite(delivered) || delivered < 50) continue;
    const wh = row.cheapestOption?.warehouse || {};
    lines.push({
      code: name,
      size: mapped.size,
      grade: mapped.grade,
      config: mapped.config,
      delivered,
      pickup: pickupByName.get(name) || 0,
      depot: [wh.city, wh.state].filter(Boolean).join(", "),
      miles: Number(row.cheapestOption?.distance) || null,
    });
  }
  if (!lines.length) return null;
  return { vendor: "usa-containers", zip, cityState: "", lines };
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
    assert.match(page, /Pull USA Containers/);
    assert.match(src, /20STRFW/);
    assert.match(page, /build 9/);
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

describe("USA Containers live pull", () => {
  it("uses their public quote calculate path and keeps one pick", () => {
    assert.match(src, /prices\.usacontainers\.co\/api\/public\/sales\/0ec013baff428eda1b5f3779327c00f9174d7d71d41f90d65f425b9abc7f9107\/quotes\/calculate/);
    assert.match(src, /usaSpecToPick|parseUsaContainers|pullUsaContainers/);
    assert.match(src, /USA CONTAINERS/);
    assert.match(index, /\/comp\/usa-containers/);
    assert.match(page, /Pull USA Containers/);
    assert.match(page, /20HC/);
    assert.match(brain, /USA Containers/);
    assert.doesNotMatch(src, /xChange/);
  });

  it("detects USA Containers separately from Container One", () => {
    assert.deepEqual(detectCompetitorPull("Pull USA Containers for ZIP 85001 — 40HC CW Standard"), {
      vendor: "usa-containers",
      zip: "85001",
      pick: { size: "40HC", grade: "CW", config: "Standard" },
    });
    assert.deepEqual(detectCompetitorPull("Pull usacontainers for ZIP 85001 — 20HC One-Trip Standard"), {
      vendor: "usa-containers",
      zip: "85001",
      pick: { size: "20HC", grade: "One-Trip", config: "Standard" },
    });
    assert.deepEqual(detectCompetitorPull("Pull USA Containers for ZIP 85001"), {
      vendor: "usa-containers",
      zip: "85001",
      needPick: true,
    });
    assert.deepEqual(detectCompetitorPull("usa containers"), {
      vendor: "usa-containers",
      needZip: true,
    });
    assert.deepEqual(detectCompetitorPull("Pull Container One for ZIP 85001 — 40HC CW Standard"), {
      vendor: "container-one",
      zip: "85001",
      pick: { size: "40HC", grade: "CW", config: "Standard" },
    });
  });

  it("posts only the picked USA Containers type and skips specialty boxes", () => {
    const pull = parseUsaContainers(usaFixture, "85001");
    assert.ok(pull);
    assert.equal(pull.lines.some((line) => /10'|Open Side/i.test(line.code)), false);
    const cw = applyCompetitorPick(pull, { size: "40HC", grade: "CW", config: "Standard" });
    assert.equal(cw.lines.length, 1);
    assert.equal(cw.lines[0].delivered, 4350.4400000000005);
    assert.equal(cw.lines[0].depot, "Long Beach, CA");
    assert.equal(cw.lines[0].grade, "WWT/CW");
    const wwt = applyCompetitorPick(pull, { size: "40HC", grade: "WWT", config: "Standard" });
    assert.equal(wwt.lines[0].delivered, cw.lines[0].delivered);
    const asis = applyCompetitorPick(pull, { size: "40STD", grade: "Economy", config: "Standard" });
    assert.equal(asis.lines[0].delivered, 3448);
    assert.equal(asis.lines[0].pickup, 2699);
    const ot = applyCompetitorPick(pull, { size: "20STD", grade: "One-Trip", config: "Standard" });
    assert.equal(ot.lines[0].delivered, 4298);
    const dd = applyCompetitorPick(pull, { size: "20STD", grade: "One-Trip", config: "Double door" });
    assert.equal(dd.lines[0].delivered, 5850.4400000000005);
    const miss = applyCompetitorPick(pull, { size: "40HC", grade: "Reefer", config: "Reefer working" });
    assert.equal(miss.lines.length, 0);
    assert.equal(usaSpecToPick("20' One-Trip Standard Open Side"), null);
    assert.equal(usaSpecToPick("10' Used Standard WWT/CW"), null);
    const card = formatCompetitorCard(cw);
    assert.match(card, /40HC WWT\/CW · Standard/);
    assert.match(card, /\$4,350(?:\.44)? delivered/);
    assert.doesNotMatch(card, /\$3,448|Open Side|10'/);
  });
});
