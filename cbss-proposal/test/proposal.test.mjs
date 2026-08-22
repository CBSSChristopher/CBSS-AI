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
  MAX_POSTED_CITY_MILES,
  pickClosestDepot,
  pickNearestPostedCity,
  pickWholesaleOffer,
  rateSheetSize,
  uniqueGrades,
} from "../src/container.js";
import { normalizeOffer, refreshXchangeInventory } from "../src/inventory.js";
import {
  isInventoryStale,
  offersFromPortalInventory,
  offersFromSearchPayload,
  portalListingToOffer,
  postedPickupPrice,
  pullXchangeOffers,
  SEARCH_PAGE_CAP,
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
    assert.deepEqual(parseOfferSpec("40HC OS 2D"), { size: "40", height: "HC", config: "side-os-2d" });
    assert.deepEqual(parseOfferSpec("40HC OS 4D"), { size: "40", height: "HC", config: "side-os-4d" });
    assert.deepEqual(parseOfferSpec("20DC Open Side 2 Doors"), { size: "20", height: "DC", config: "side-os-2d" });
    assert.deepEqual(parseOfferSpec("40HC Open Side 4 Doors"), { size: "40", height: "HC", config: "side-os-4d" });
    assert.deepEqual(parseOfferSpec("40HC Open Side Full Open"), { size: "40", height: "HC", config: "full-open-side" });
    assert.equal(parseOfferSpec("40DC Open Top").config, "other");
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
    assert.match(page, /build 5/);
    assert.match(page, /did not post this box/);
    assert.match(page, /lastZipGeo/);
    assert.match(page, /Do not invent/);
    assert.match(page, /data-val="side-os-2d"/);
    assert.match(page, /data-val="side-os-4d"/);
    assert.match(page, /Side door \(OS 2D\)/);
    assert.match(page, /Side door \(OS 4D\)/);
    assert.match(page, /OS 2D and OS 4D are side-door units/);
    assert.doesNotMatch(page, /n\.includes\("openside"\) \|\| n\.includes\("hcos"\)/);
  });

  it("does not price a full open side from an OS 2D or OS 4D row", () => {
    const offers = [
      { size: "40HC Open Side 4 Doors", condition: "New", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 5475, qty: 2 },
      { size: "40HC Open Side Full Open", condition: "New", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 9175, qty: 5 },
      { size: "20DC Open Side 2 Doors", condition: "New", depot: "Memphis, TN", location: "Memphis, TN", wholesaleCost: 3770, qty: 10 },
    ];
    const city = cityKey("Memphis", "TN");
    const os4 = pickWholesaleOffer(offers, { size: "40", height: "HC", config: "side-os-4d", grade: "OneTrip", qty: 1, cityKey: city });
    const full = pickWholesaleOffer(offers, { size: "40", height: "HC", config: "full-open-side", grade: "OneTrip", qty: 1, cityKey: city });
    const os2 = pickWholesaleOffer(offers, { size: "20", height: "DC", config: "side-os-2d", grade: "OneTrip", qty: 1, cityKey: city });
    assert.equal(os4.wholesaleCost, 5475);
    assert.equal(full.wholesaleCost, 9175);
    assert.equal(os2.wholesaleCost, 3770);
    assert.equal(pickWholesaleOffer(offers, { size: "40", height: "HC", config: "side-os-2d", grade: "OneTrip", qty: 1, cityKey: city }), null);
    assert.equal(pickWholesaleOffer(offers, { size: "40", height: "HC", config: "full-open-side", grade: "CW", qty: 1, cityKey: city }), null);
  });

  it("maps Saint Louis and Kansas City xChange names onto our hubs", () => {
    assert.equal(findCityHub("Saint Louis, MO").city, "St. Louis");
    assert.equal(findCityHub("Kansas City, KS").state, "MO");
    assert.equal(findCityHub("Fort Worth, TX").city, "Dallas");
    assert.equal(findCityHub("Jersey City, NJ").city, "Newark");
    assert.equal(findCityHub("San Pedro, CA").city, "Long Beach");
    assert.equal(findCityHub("St. Paul, MN").city, "Minneapolis");
    assert.equal(findCityHub("Tacoma, WA").region, "West Coast");
    assert.equal(findCityHub("Cincinnati, OH").region, "Midwest");
    assert.equal(findCityHub("Chesapeake, VA").region, "East Coast");
  });

  it("uses the nearest city that posted the box instead of blanking a nearest-city miss", () => {
    const offers = [
      { size: "40HC", condition: "CW", depot: "Phoenix, AZ", location: "Phoenix, AZ", wholesaleCost: 2900, qty: 1, lat: 33.45, lon: -112.07 },
      { size: "20DC", condition: "CW", depot: "Los Angeles, CA", location: "Los Angeles, CA", wholesaleCost: 925, qty: 4, lat: 34.05, lon: -118.24 },
      { size: "40HC", condition: "CW", depot: "Portland, OR", location: "Portland, OR", wholesaleCost: 1800, qty: 2, lat: 45.52, lon: -122.68 },
      { size: "20DC", condition: "CW", depot: "Tacoma, WA", location: "Tacoma, WA", wholesaleCost: 1550, qty: 5, lat: 47.25, lon: -122.44 },
    ];
    const want20 = { size: "20", height: "DC", config: "standard", grade: "CW", qty: 1 };
    const phoenix = pickNearestPostedCity(offers, 33.4484, -112.074, want20);
    assert.equal(phoenix.city.city, "Los Angeles");
    assert.equal(phoenix.offer.wholesaleCost, 925);
    assert.equal(phoenix.skipped.city, "Phoenix");
    const portland = pickNearestPostedCity(offers, 45.5152, -122.6784, want20);
    assert.equal(portland.city.city, "Tacoma");
    assert.equal(portland.offer.wholesaleCost, 1550);
    assert.equal(portland.skipped.city, "Portland");
    const local40 = pickNearestPostedCity(offers, 33.4484, -112.074, {
      size: "40",
      height: "HC",
      config: "standard",
      grade: "CW",
      qty: 1,
    });
    assert.equal(local40.city.city, "Phoenix");
    assert.equal(local40.offer.wholesaleCost, 2900);
    assert.equal(local40.skipped, null);
    assert.equal(MAX_POSTED_CITY_MILES, 800);
    const honolulu = pickNearestPostedCity(offers, 21.3069, -157.8583, want20);
    assert.equal(honolulu.offer, null);
    assert.match(page, /city\.miles > 800/);
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

  it("pages past the first 80 search rows in the browser pull", () => {
    const src = readFileSync(new URL("../src/xchange.js", import.meta.url), "utf8");
    assert.equal(SEARCH_PAGE_CAP, 5);
    assert.match(src, /pageNo <= 5/);
    assert.match(src, /limit=80&page=" \+\s*pageNo/);
    assert.doesNotMatch(src, /limit=80&page=1"/);
    assert.match(src, /r\.unlocode_safe \|\| r\.unlocode \|\| r\.country_code/);
  });

  it("reads posted pickup from the signed-in buyer portal and keeps city min only", async () => {
    const portalFixture = JSON.parse(
      readFileSync(new URL("./xchange-portal.fixture.json", import.meta.url), "utf8")
    );
    const geo = {
      USHOU: { lat: 29.7604, lon: -95.3698 },
      USLAX: { lat: 33.9425, lon: -118.408 },
    };
    const houston = portalListingToOffer(portalFixture.listings[0], geo);
    assert.equal(houston.size, "20DC");
    assert.equal(houston.condition, "CW");
    assert.equal(houston.wholesaleCost, 835);
    assert.equal(houston.lat, 29.7604);
    assert.equal(portalListingToOffer(portalFixture.listings[2], geo), null);
    assert.equal(portalListingToOffer(portalFixture.listings[3], geo), null);
    const offers = offersFromPortalInventory(portalFixture.listings, geo);
    const houCw = offers.find((o) => o.location === "Houston, TX" && o.size === "20DC" && o.condition === "CW");
    assert.equal(houCw.wholesaleCost, 835);
    assert.equal(houCw.qty, 6);
    assert.ok(offers.some((o) => o.size === "20DC Open Side 2 Doors" && o.wholesaleCost === 2645));
    assert.ok(!offers.some((o) => o.location.startsWith("Toronto")));
    assert.ok(!offers.some((o) => o.wholesaleCost === 1100));

    const pulled = await pullXchangeOffers({
      env: { XCHANGE_SESSION: "test-session", XCHANGE_USER_HASH: "abc123" },
      fetchImpl: async (url, init) => {
        const u = String(url);
        const cookie = init && init.headers && init.headers.Cookie;
        if (u.includes("my-inventory") && u.includes("/api/inventory")) {
          assert.match(String(cookie || ""), /xchange_verified_session=test-session/);
          return { ok: true, json: async () => portalFixture.listings };
        }
        if (u.includes("my-inventory") && u.includes("/api/locations")) {
          return { ok: true, json: async () => portalFixture.locations };
        }
        throw new Error("portal pull must not fall back to www search");
      },
    });
    assert.equal(pulled.length, 3);
    assert.ok(pulled.some((o) => o.location === "Los Angeles, CA" && o.wholesaleCost === 1225 && o.lat === 33.9425));
  });
});
