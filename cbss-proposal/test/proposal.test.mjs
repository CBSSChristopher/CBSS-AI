import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  cityKey,
  customerCashTotal,
  describeContainer,
  displayCityState,
  groupOffersByCity,
  mapGrade,
  parseOfferSpec,
  pickClosestDepot,
  pickWholesaleOffer,
  rateSheetSize,
  uniqueGrades,
} from "../src/container.js";
import { normalizeOffer, refreshXchangeInventory } from "../src/inventory.js";
import {
  isInventoryStale,
  offersFromSearchPayload,
  postedPickupPrice,
  pullXchangeOffers,
  searchRowToOffer,
  usDepotLocations,
} from "../src/xchange.js";
import { findCityHub } from "../src/container.js";

const page = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const submit = readFileSync(new URL("../src/submit-proposal.js", import.meta.url), "utf8");

describe("Proposal tool picker, depot, and cash price", () => {
  it("maps messy xChange grades to one CW/IICL/WWT/OneTrip/AsIs each", () => {
    assert.equal(mapGrade("Cargo Worthy"), "CW");
    assert.equal(mapGrade("CW"), "CW");
    assert.equal(mapGrade("IICL"), "IICL");
    assert.equal(mapGrade("IICL (older)"), "IICL");
    assert.equal(mapGrade("IICL (newer)/multi-trip"), "IICL");
    assert.equal(mapGrade("Wind & Water Tight"), "WWT");
    const grades = uniqueGrades(["CW", "Cargo Worthy", "IICL", "IICL (older)", "WWT", "One-Trip", "As-Is"]);
    assert.deepEqual(grades.map((g) => g.value), ["CW", "IICL", "WWT", "OneTrip", "AsIs"]);
    assert.match(page, /IICL\/Multi-Trip/);
    assert.match(page, /value="IICL"/);
  });

  it("parses size, height, and configuration instead of a crowded size dump", () => {
    assert.deepEqual(parseOfferSpec("40HC"), { size: "40", height: "HC", config: "standard" });
    assert.deepEqual(parseOfferSpec("40' Standard"), { size: "40", height: "DC", config: "standard" });
    assert.deepEqual(parseOfferSpec("20ft DC"), { size: "20", height: "DC", config: "standard" });
    assert.deepEqual(parseOfferSpec("40 HC side door"), { size: "40", height: "HC", config: "side-door" });
    assert.deepEqual(parseOfferSpec("40HC OS 4D"), { size: "40", height: "HC", config: "full-open-side" });
    assert.equal(parseOfferSpec("40HC Reefer").config, "other");
    assert.equal(rateSheetSize("40", "standard"), "40ft");
    assert.equal(rateSheetSize("20", "standard"), "20ft");
    assert.equal(rateSheetSize("40", "full-open-side"), "Specialized");
    assert.match(describeContainer("40", "HC", "standard", "CW"), /40 ft High Cube Cargo Worthy/);
  });

  it("picks one closest depot, not every yard in that city", () => {
    const pick = pickClosestDepot([
      { name: "Phoenix A", miles: 41 },
      { name: "Phoenix B", miles: 38 },
      { name: "Phoenix C", miles: 90 },
    ]);
    assert.equal(pick.name, "Phoenix B");
    assert.match(page, /This is your depot/);
    assert.match(page, /This is how far/);
    assert.match(page, /return list\.slice\(0, 1\)/);
    assert.match(page, /This is your depot: \$\{escapeHtml\(displayName\)\}/);
    assert.doesNotMatch(page, /This is your depot: \$\{d\.name\}/);
    assert.doesNotMatch(page, /Find Closest Depots/);
    assert.doesNotMatch(page, /Est\. Delivery/);
  });

  it("shows city and state for a Memphis yard, not the yard name", () => {
    assert.equal(displayCityState("CMC (Raines Road Depot)"), "Memphis, TN");
    assert.equal(displayCityState({ depot: "CMC\u00a0(Raines Road Depot)", location: "Memphis, TN" }), "Memphis, TN");
    assert.equal(displayCityState({ name: "Memphis, TN" }), "Memphis, TN");
    assert.equal(displayCityState("ConGlobal (Lanport) - Memphis"), "Memphis, TN");
  });

  it("matches wholesale by city and lowest price that covers qty", () => {
    const offers = [
      { size: "40HC", condition: "CW", depot: "CMC (Raines Road Depot)", location: "Memphis, TN", wholesaleCost: 2100, qty: 4 },
      { size: "40HC", condition: "CW", depot: "ConGlobal (Lanport) - Memphis", location: "Memphis, TN", wholesaleCost: 1850, qty: 2 },
      { size: "40HC", condition: "CW", depot: "CMC Charleston", location: "Charleston, SC", wholesaleCost: 900, qty: 10 },
      { size: "40HC OS 4D", condition: "CW", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 400, qty: 3 },
      { size: "40ft", condition: "CW", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 1200, qty: 1 },
    ];
    const want = { size: "40", height: "HC", config: "standard", grade: "CW", qty: 1, cityKey: cityKey("Memphis", "TN") };
    const pick = pickWholesaleOffer(offers, want);
    assert.equal(pick.wholesaleCost, 1850);
    assert.equal(pick.depot, "ConGlobal (Lanport) - Memphis");
    const needTwo = pickWholesaleOffer(offers, { ...want, qty: 3 });
    assert.equal(needTwo.wholesaleCost, 2100);
    assert.equal(pickWholesaleOffer(offers, { ...want, cityKey: cityKey("Charleston", "SC") }).wholesaleCost, 900);
    assert.equal(pickWholesaleOffer([{ size: "40HC", condition: "New", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 500, qty: 1 }], want), null);
  });

  it("keeps 40HC wholesale instead of flattening it to a 40ft DC miss", () => {
    const pick = pickWholesaleOffer(
      [{ size: "40HC", condition: "CW", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 1950, qty: 1 }],
      { size: "40", height: "HC", config: "standard", grade: "CW", qty: 1, cityKey: cityKey("Memphis", "TN") }
    );
    assert.equal(pick.wholesaleCost, 1950);
    assert.match(page, /const size = cleanPlace\(o\.size \|\| o\.containerSize \|\| o\.type\)/);
    assert.doesNotMatch(page, /const size = mapOfferSize\(o\.size/);
  });

  it("ports xChange type/price rows into size and wholesale", () => {
    const row = normalizeOffer({
      type: "40HC",
      size: "",
      condition: "CW Cargo Worthy",
      depot: "ConGlobal (Lanport) - Memphis",
      location: "Memphis, TN",
      city: "Memphis",
      price: 1400,
      qty: 41,
    });
    assert.equal(row.size, "40HC");
    assert.equal(row.wholesaleCost, 1400);
    const pick = pickWholesaleOffer([row], {
      size: "40",
      height: "HC",
      config: "standard",
      grade: "CW",
      qty: 1,
      cityKey: cityKey("Memphis", "TN"),
    });
    assert.equal(pick.wholesaleCost, 1400);
  });

  it("groups Jonesboro-nearest inventory as Memphis, TN", () => {
    const groups = groupOffersByCity(
      [
        { depot: "CMC (Raines Road Depot)", location: "Memphis, TN", qty: 2 },
        { depot: "Charleston CMC", location: "Charleston, SC", qty: 2 },
      ],
      35.8423,
      -90.7043
    );
    assert.equal(groups[0].name, "Memphis, TN");
    assert.ok(groups[0].miles > 50 && groups[0].miles < 80);
  });

  it("does not add delivery on top of a delivered cash price", () => {
    assert.equal(customerCashTotal(2900, 1), 2900);
    assert.equal(customerCashTotal(2900, 2), 5800);
    assert.match(submit, /Delivered cash price \(each\)/);
    assert.match(submit, /already includes standard weekday delivery/);
    assert.doesNotMatch(submit, /grandTotal = totalSell \+ totalDelivery/);
    assert.doesNotMatch(submit, /Delivery \(each\)/);
    assert.match(page, /Delivery is already inside that cash price/);
    assert.match(page, /10 ft/);
    assert.match(page, /High cube \/ HC/);
    assert.match(page, /Full open side/);
    assert.match(page, /id="boxConfig"/);
    assert.match(page, /id="boxQty"/);
    assert.match(page, /How many/);
    assert.match(page, /nudgeQty/);
    assert.doesNotMatch(page, /label for="containerDesc"/);
    assert.match(page, /quantity: String\(currentQty\(\)\)/);
    assert.equal(customerCashTotal(2900, 2), 5800);
  });

  it("uses desk-style pick buttons and a Pull xChange action", () => {
    assert.match(page, /data-val="20STD"/);
    assert.match(page, /data-val="40HC"/);
    assert.match(page, /id="pullXchangeBtn"/);
    assert.match(page, /Pull xChange/);
    assert.match(page, /pulledAt/);
    assert.match(page, /build 2/);
    assert.match(page, /Do not invent/);
  });

  it("maps Saint Louis and Kansas City xChange names onto our hubs", () => {
    assert.equal(findCityHub("Saint Louis, MO").city, "St. Louis");
    assert.equal(findCityHub("Kansas City, KS").state, "MO");
  });

  it("keeps the login script valid", () => {
    const js = page.split("<script>")[1].split("</script>")[0];
    writeFileSync("/tmp/proposal_page_check.js", js);
    const check = spawnSync("node", ["--check", "/tmp/proposal_page_check.js"], { encoding: "utf8" });
    assert.equal(check.status, 0, check.stderr || check.stdout);
  });
});

const searchFixture = JSON.parse(
  readFileSync(new URL("./xchange-search.fixture.json", import.meta.url), "utf8")
);

describe("xChange posted-price pull", () => {
  it("takes Min_Price from a search row and skips empty or zero-qty rows", () => {
    const houston = searchRowToOffer(searchFixture.results[0], { lat: 29.76, lon: -95.37 });
    assert.equal(houston.size, "40HC");
    assert.equal(houston.condition, "CW");
    assert.equal(houston.wholesaleCost, 1375);
    assert.equal(houston.qty, 85);
    const offers = offersFromSearchPayload(searchFixture);
    assert.equal(offers.length, 4);
    assert.ok(offers.every((o) => o.wholesaleCost > 0));
    assert.ok(!offers.some((o) => o.size === "40DC"));
    const memphis = offers.find((o) => o.location.startsWith("Memphis") && o.size === "40HC" && o.condition === "CW");
    assert.equal(memphis.wholesaleCost, 1400);
  });

  it("never treats a city starting_price as a size wholesale", () => {
    assert.equal(postedPickupPrice({ starting_price: 525, ending_price: 8510, location_name: "Houston, TX" }), null);
    assert.equal(searchRowToOffer({ starting_price: 525, Location: "Houston, TX", Type: "40HC", Condition: "CW" }), null);
    assert.equal(normalizeOffer({ starting_price: 525, type: "40HC", location: "Houston, TX" }).wholesaleCost, null);
  });

  it("keeps stale empty inventory empty instead of inventing a number", async () => {
    assert.equal(isInventoryStale("", new Date()), true);
    assert.equal(isInventoryStale(new Date().toISOString(), new Date(), 15 * 60 * 1000), false);
    const store = new Map();
    const env = {
      CRM_STORE: {
        async get() {
          return store.get("xchange-inventory") || null;
        },
        async put(_key, value) {
          store.set("xchange-inventory", JSON.parse(value));
        },
      },
    };
    const empty = await refreshXchangeInventory(env, {
      fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) }),
    });
    assert.equal(empty.ok, false);
    assert.equal(store.has("xchange-inventory"), false);

    const pulled = await pullXchangeOffers({
      fetchImpl: async (url) => {
        const u = String(url);
        if (u.includes("depot-locations")) {
          return {
            ok: true,
            json: async () => [
              { location_name: "Houston, TX", latitude: 29.76, longitude: -95.37, unlocode_safe: "USHOU" },
              { location_name: "Toronto, ON", latitude: 43.65, longitude: -79.38, unlocode_safe: "CATOR" },
            ],
          };
        }
        if (u.includes("location=Houston")) {
          return { ok: true, json: async () => searchFixture };
        }
        if (u.includes("Toronto")) {
          throw new Error("must not search Canada");
        }
        return { ok: true, json: async () => ({ results: [] }) };
      },
    });
    assert.ok(pulled.some((o) => o.size === "40HC" && o.condition === "CW" && o.wholesaleCost === 1375));
    assert.ok(usDepotLocations([{ unlocode_safe: "USHOU" }, { unlocode_safe: "CATOR" }]).length === 1);
  });
});
