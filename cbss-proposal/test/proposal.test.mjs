import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

function pdfPlainText(bytes) {
  const src = Buffer.from(bytes).toString("latin1");
  const chunks = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  while ((match = re.exec(src))) {
    try {
      chunks.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
    } catch {
      chunks.push(match[1]);
    }
  }
  const raw = chunks.join("\n");
  const decoded = [];
  for (const hex of raw.matchAll(/<([0-9A-Fa-f]+)>/g)) {
    decoded.push(Buffer.from(hex[1], "hex").toString("latin1"));
  }
  return decoded.join("\n");
}
import {
  cityKey,
  clampNetMargin,
  customerCashTotal,
  DEFAULT_NET_MARGIN,
  deliveredCashFromPosted,
  fulfillmentHaul,
  isPickupFulfillment,
  MAX_NET_MARGIN,
  MIN_NET_MARGIN,
  normalizeFulfillment,
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
import {
  expectedApprovalCode,
  isApprovedPricingRequest,
  isValidManagerApprovalCode,
  parseApprovedCash,
} from "../src/approval.js";
import {
  buildClientProposalCopy,
  notesHaveCostLeak,
  optionsHeading,
  readClientOptions,
  sanitizeClientFacingText,
} from "../src/client-options.js";
import { generateClientPDF, resolveProposalPricing } from "../src/submit-proposal.js";

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

  it("lets staff set net margin from 300 to 2000 without inventing wholesale", () => {
    assert.equal(MIN_NET_MARGIN, 300);
    assert.equal(MAX_NET_MARGIN, 2000);
    assert.equal(DEFAULT_NET_MARGIN, 700);
    assert.equal(clampNetMargin(""), 700);
    assert.equal(clampNetMargin(250), 300);
    assert.equal(clampNetMargin(900), 900);
    assert.equal(clampNetMargin(2500), 2000);
    assert.equal(clampNetMargin(425), 425);
    assert.equal(clampNetMargin("$350"), 350);
    assert.equal(deliveredCashFromPosted(1850, 500, 700), 3050);
    assert.equal(deliveredCashFromPosted(1850, 500, 300), 2650);
    assert.equal(deliveredCashFromPosted(1850, 500, 2000), 4350);
    assert.equal(deliveredCashFromPosted(0, 500, 700), null);
    assert.match(page, /id="netMargin"/);
    assert.match(page, /min="300"/);
    assert.match(page, /max="2000"/);
    assert.match(page, /currentNetMargin/);
    assert.match(page, /This does not invent a wholesale/);
    assert.match(page, /targetMargin = currentNetMargin\(\)/);
    assert.doesNotMatch(page, /TARGET_MARGIN = 700/);
    assert.match(submit, /clampNetMargin/);
    assert.match(submit, /data\.netMargin/);
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

  it("lets the rep pick depot pickup and zeroes delivery without inventing a fee", () => {
    assert.equal(normalizeFulfillment("Picked up"), "pickup");
    assert.equal(normalizeFulfillment("deliver"), "deliver");
    assert.equal(isPickupFulfillment("pickup"), true);
    assert.equal(isPickupFulfillment(""), false);
    assert.equal(fulfillmentHaul("pickup", 625), 0);
    assert.equal(fulfillmentHaul("deliver", 625), 625);
    assert.equal(deliveredCashFromPosted(1850, fulfillmentHaul("pickup", 500), 700), 2550);
    assert.equal(deliveredCashFromPosted(1850, fulfillmentHaul("deliver", 500), 700), 3050);
    assert.match(page, /id="fulfillPickupBtn"/);
    assert.match(page, /id="fulfillDeliverBtn"/);
    assert.match(page, /data-fulfill="pickup"/);
    assert.match(page, /currentFulfillment/);
    assert.match(page, /setFulfillment/);
    assert.match(page, /fulfillment === "pickup" \? 0/);
    assert.match(page, /Do not add a pickup fee/);
    assert.match(page, /Customer pickup at /);
    assert.match(submit, /isPickupFulfillment/);
    assert.match(submit, /Pickup cash price \(each\)/);
    assert.match(submit, /Do not add a pickup fee/);
    assert.match(submit, /const deliveryPer = isPickupFulfillment/);
    assert.doesNotMatch(page, /pickup fee \$/);
  });

  it("unlocks a free cash number only after the server checks the manager approval code", () => {
    const defaultCode = expectedApprovalCode({});
    assert.ok(defaultCode);
    assert.equal(isValidManagerApprovalCode(defaultCode, {}), true);
    assert.equal(isValidManagerApprovalCode("0000", {}), false);
    assert.equal(isValidManagerApprovalCode("", {}), false);
    assert.equal(isValidManagerApprovalCode(defaultCode, { MANAGER_APPROVAL_CODE: "9999" }), false);
    assert.equal(isValidManagerApprovalCode("9999", { MANAGER_APPROVAL_CODE: "9999" }), true);
    assert.equal(parseApprovedCash("1847.5"), 1847.5);
    assert.equal(parseApprovedCash("$1,200"), 1200);
    assert.equal(parseApprovedCash("0"), null);
    assert.equal(isApprovedPricingRequest({ approvedPricing: true }), true);
    assert.equal(isApprovedPricingRequest({ pricingMode: "christopher-approved" }), true);
    assert.equal(isApprovedPricingRequest({}), false);

    const low = resolveProposalPricing({
      unitPrice: 1500,
      wholesaleCost: 1400,
      deliveryCost: 600,
      fulfillment: "deliver",
    }, {});
    assert.equal(low.ok, true);
    assert.equal(low.isLowMargin, true);
    assert.equal(low.approved, false);

    const blocked = resolveProposalPricing({
      unitPrice: 1500,
      wholesaleCost: 1400,
      deliveryCost: 600,
      fulfillment: "deliver",
      approvedPricing: true,
    }, {});
    assert.equal(blocked.ok, false);
    assert.equal(blocked.status, 403);

    const wrong = resolveProposalPricing({
      unitPrice: 1500,
      wholesaleCost: 1400,
      deliveryCost: 600,
      fulfillment: "pickup",
      approvedPricing: true,
      managerApprovalCode: "0000",
    }, {});
    assert.equal(wrong.ok, false);

    const approved = resolveProposalPricing({
      unitPrice: 1500,
      wholesaleCost: 1400,
      deliveryCost: 600,
      fulfillment: "pickup",
      approvedPricing: true,
      managerApprovalCode: defaultCode,
    }, {});
    assert.equal(approved.ok, true);
    assert.equal(approved.approved, true);
    assert.equal(approved.skipLowMargin, true);
    assert.equal(approved.isLowMargin, false);
    assert.equal(approved.sell, 1500);
    assert.equal(approved.deliveryPer, 0);
    assert.equal(approved.marginPer, 100);

    assert.match(page, /id="approvedPricingBtn"/);
    assert.match(page, /Christopher approved pricing/);
    assert.match(page, /verifyApprovedPricing/);
    assert.match(page, /\/approval\/verify/);
    assert.match(page, /id="approvedUnitPrice"/);
    assert.match(page, /isApprovedPricingUnlocked/);
    assert.match(page, /managerApprovalCode/);
    assert.match(page, /pricingMode: isApprovedPricingUnlocked\(\) \? "christopher-approved"/);
    assert.doesNotMatch(page, new RegExp(defaultCode));
    assert.match(submit, /Christopher approved pricing/);
    assert.match(submit, /resolveProposalPricing/);
    assert.match(submit, /delete data\.managerApprovalCode/);
    const clientPdf = submit.slice(submit.indexOf("async function generateClientPDF"), submit.indexOf("function getConditionExpectations"));
    assert.doesNotMatch(clientPdf, /Christopher approved/);
    assert.doesNotMatch(clientPdf, /manager approval/);
    assert.match(page, /build 10/);
  });

  it("uses desk-style pick buttons and a Pull xChange action", () => {
    assert.match(page, /data-val="20STD"/);
    assert.match(page, /data-val="40HC"/);
    assert.match(page, /id="pullXchangeBtn"/);
    assert.match(page, /Pull xChange/);
    assert.match(page, /pulledAt/);
    assert.match(page, /build 10/);
    assert.match(page, /id="netMargin"/);
    assert.match(page, /Net margin \$300–\$2,000/);
    assert.match(page, /viewport-fit=cover/);
    assert.match(page, /@media \(max-width: 600px\)/);
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

describe("Client proposal options PDF", () => {
  const twoOptions = {
    customerName: "Ronnie Gamble",
    company: "",
    phone: "555-0100",
    email: "ronnie@example.com",
    fulfillment: "deliver",
    delivery: "North Charleston, SC",
    containerDesc: "Option A 1 × 20 ft Cargo Worthy; Option B 1 × 20 ft One-Trip",
    containerNotes: "20 ft standard Standard CW · depot Charleston, SC\n20 ft standard Standard OneTrip · depot Charleston, SC",
    quantity: "1",
    unitPrice: 1950,
    wholesaleCost: 4900,
    deliveryCost: 950,
    chooseOne: true,
    options: [
      {
        letter: "A",
        label: "Cargo Worthy",
        size: "20",
        height: "DC",
        grade: "CW",
        qty: 1,
        cash: 1950,
        depotCity: "Charleston, SC",
        warranty: "5-year structural + 5-year no-leak warranty",
        fulfillment: "deliver",
        notes: "20 ft standard Standard CW · depot Charleston, SC",
        wholesale: 725,
        delivery: 475,
        margin: 750,
      },
      {
        letter: "B",
        label: "One-Trip",
        size: "20",
        height: "DC",
        grade: "OneTrip",
        qty: 1,
        cash: 2950,
        depotCity: "Charleston, SC",
        warranty: "10-year structural + 10-year no-leak warranty",
        fulfillment: "deliver",
        notes: "20 ft standard Standard OneTrip · depot Charleston, SC",
        wholesale: 1625,
        delivery: 475,
        margin: 850,
      },
    ],
  };

  it("builds Option A / Option B copy without posted or delivery dollars", () => {
    const copy = buildClientProposalCopy(twoOptions);
    assert.equal(copy.chooseOne, true);
    assert.equal(copy.options.length, 2);
    assert.equal(copy.heading, "TWO OPTIONS");
    assert.equal(copy.optionCards[0].header, "Option A - Cargo Worthy");
    assert.equal(copy.optionCards[0].badge, "Used CW");
    assert.equal(copy.optionCards[1].header, "Option B - One-Trip");
    assert.equal(copy.optionCards[1].badge, "One-Trip");
    assert.match(copy.optionCards[0].title, /Cargo Worthy/);
    assert.match(copy.optionCards[1].title, /One-Trip/);
    assert.match(copy.pricing.join("\n"), /Option A - 20 ft Cargo Worthy \(each\)/);
    assert.match(copy.pricing.join("\n"), /\$1,950\.00/);
    assert.match(copy.pricing.join("\n"), /Option B - 20 ft One-Trip \(each\)/);
    assert.match(copy.pricing.join("\n"), /\$2,950\.00/);
    assert.match(copy.chooseOneBar, /Choose one option - total is the delivered cash price for that unit/);
    assert.doesNotMatch(copy.pricing.join("\n") + copy.chooseOneBar, /4900|9800/);
    assert.equal(notesHaveCostLeak(copy.notes), false);
    const leaked = sanitizeClientFacingText("20 ft CW · posted 725 · delivery 475 · depot Charleston, SC");
    assert.doesNotMatch(leaked, /\bposted\b/i);
    assert.doesNotMatch(leaked, /\bdelivery\s+\$?\d/i);
  });

  it("keeps a single-line proposal as one cash price", () => {
    const copy = buildClientProposalCopy({
      customerName: "Pat Lee",
      fulfillment: "deliver",
      containerDesc: "20 ft standard Standard WWT",
      containerNotes: "20 ft standard Standard WWT · depot Memphis, TN",
      quantity: 1,
      unitPrice: 1900,
      depotCity: "Memphis, TN",
      condition: "WWT",
    });
    assert.equal(copy.chooseOne, false);
    assert.equal(copy.options.length, 1);
    assert.equal(copy.heading, "CONTAINER DETAILS");
    assert.match(copy.pricing.join("\n"), /Delivered cash price \(each\)/);
    assert.match(copy.pricing.join("\n"), /\$1,900\.00/);
  });

  it("renders two-option PDF bytes with A/B cards and no cost leak", async () => {
    const bytes = await generateClientPDF(twoOptions, {
      intro: "Here are two delivered options for the same drop.",
      whatToExpect: ["Air and water leak tested before it leaves the depot."],
      closing: "Reply with Option A or Option B.",
    });
    const text = pdfPlainText(bytes);
    assert.match(text, /CONTAINER PROPOSAL/);
    assert.match(text, /Transparent Pricing/);
    assert.match(text, /TWO OPTIONS/);
    assert.match(text, /Option A - Cargo Worthy/);
    assert.match(text, /Option B - One-Trip/);
    assert.match(text, /Used CW/);
    assert.match(text, /\$1,950\.00/);
    assert.match(text, /\$2,950\.00/);
    assert.match(text, /Charleston, SC/);
    assert.match(text, /Choose one option - total is the delivered cash price for that unit/);
    assert.doesNotMatch(text, /posted 725|posted \$725/i);
    assert.doesNotMatch(text, /delivery 475|delivery \$475/i);
    assert.doesNotMatch(text, /wholesale/i);
    const leakIn = {
      ...twoOptions,
      containerNotes: "20 ft CW · posted 725 · delivery 475 · depot Charleston, SC",
      notes: "posted 900 · delivery 400",
    };
    const cleaned = await generateClientPDF(leakIn, null);
    const cleanedText = pdfPlainText(cleaned);
    assert.doesNotMatch(cleanedText, /\bposted\b/i);
    assert.doesNotMatch(cleanedText, /delivery 475|delivery \$475/i);
    const one = await generateClientPDF({
      customerName: "Pat Lee",
      fulfillment: "deliver",
      containerDesc: "20 ft standard Standard WWT",
      containerNotes: "20 ft standard Standard WWT · depot Memphis, TN",
      quantity: 1,
      unitPrice: 1900,
      depotCity: "Memphis, TN",
      condition: "WWT",
    }, null);
    const oneText = pdfPlainText(one);
    assert.match(oneText, /CONTAINER DETAILS/);
    assert.match(oneText, /TOTAL INVESTMENT/);
    assert.doesNotMatch(oneText, /OPTION B/);
  });

  it("flags low margin on any option, not a summed buy-both number", () => {
    const priced = resolveProposalPricing(twoOptions, {});
    assert.equal(priced.ok, true);
    assert.equal(priced.chooseOne, true);
    assert.equal(priced.isLowMargin, false);
    const low = resolveProposalPricing({
      ...twoOptions,
      options: [
        { ...twoOptions.options[0], cash: 800, wholesale: 725, delivery: 475, margin: -400 },
        twoOptions.options[1],
      ],
    }, {});
    assert.equal(low.isLowMargin, true);
    assert.equal(readClientOptions(twoOptions).options[0].letter, "A");
  });

  const threeOptions = {
    customerName: "Frank Payberg",
    company: "N/A",
    phone: "",
    email: "fpayberg@gmail.com",
    fulfillment: "deliver",
    delivery: "Jacksonville, FL",
    containerDesc: "Option A 1 × 40 ft Wind & Water Tight; Option B 1 × 40 ft Wind & Water Tight; Option C 1 × 40 ft One-Trip",
    containerNotes: "40 ft high cube Standard WWT · depot Jacksonville, FL\n40 ft standard Standard WWT · depot Jacksonville, FL\n40 ft high cube Standard OneTrip · depot Jacksonville, FL",
    quantity: "1",
    unitPrice: 3250,
    wholesaleCost: 6050,
    deliveryCost: 1800,
    chooseOne: true,
    options: [
      {
        letter: "A",
        label: "Wind & Water Tight",
        size: "40",
        height: "HC",
        grade: "WWT",
        qty: 1,
        cash: 3250,
        depotCity: "Jacksonville, FL",
        warranty: "5-year structural + 5-year no-leak warranty",
        fulfillment: "deliver",
        notes: "40 ft high cube Standard WWT · depot Jacksonville, FL",
        wholesale: 1850,
        delivery: 600,
        margin: 800,
      },
      {
        letter: "B",
        label: "Wind & Water Tight",
        size: "40",
        height: "DC",
        grade: "WWT",
        qty: 1,
        cash: 3200,
        depotCity: "Jacksonville, FL",
        warranty: "5-year structural + 5-year no-leak warranty",
        fulfillment: "deliver",
        notes: "40 ft standard Standard WWT · depot Jacksonville, FL",
        wholesale: 1800,
        delivery: 600,
        margin: 800,
      },
      {
        letter: "C",
        label: "One-Trip",
        size: "40",
        height: "HC",
        grade: "OneTrip",
        qty: 1,
        cash: 4100,
        depotCity: "Jacksonville, FL",
        warranty: "10-year structural + 10-year no-leak warranty",
        fulfillment: "deliver",
        notes: "40 ft high cube Standard OneTrip · depot Jacksonville, FL",
        wholesale: 2400,
        delivery: 600,
        margin: 1100,
      },
    ],
  };

  it("names ONE / TWO / THREE OPTIONS and YOUR OPTIONS from the count", () => {
    assert.equal(optionsHeading(1), "ONE OPTION");
    assert.equal(optionsHeading(2), "TWO OPTIONS");
    assert.equal(optionsHeading(3), "THREE OPTIONS");
    assert.equal(optionsHeading(4), "YOUR OPTIONS");
  });

  it("builds Option A / B / C copy and lists every delivered cash price", () => {
    const copy = buildClientProposalCopy(threeOptions);
    assert.equal(copy.chooseOne, true);
    assert.equal(copy.options.length, 3);
    assert.equal(copy.heading, "THREE OPTIONS");
    assert.equal(copy.optionCards.length, 3);
    assert.equal(copy.optionCards[0].header, "Option A - Wind & Water Tight");
    assert.equal(copy.optionCards[1].header, "Option B - Wind & Water Tight");
    assert.equal(copy.optionCards[2].header, "Option C - One-Trip");
    assert.match(copy.optionCards[0].title, /high cube/);
    assert.match(copy.optionCards[1].title, /standard/);
    assert.match(copy.optionCards[2].title, /One-Trip/);
    assert.match(copy.pricing.join("\n"), /Option A - 40 ft Wind & Water Tight \(each\)/);
    assert.match(copy.pricing.join("\n"), /\$3,250\.00/);
    assert.match(copy.pricing.join("\n"), /Option B - 40 ft Wind & Water Tight \(each\)/);
    assert.match(copy.pricing.join("\n"), /\$3,200\.00/);
    assert.match(copy.pricing.join("\n"), /Option C - 40 ft One-Trip \(each\)/);
    assert.match(copy.pricing.join("\n"), /\$4,100\.00/);
    assert.equal(copy.pricing.length, 3);
    assert.match(copy.chooseOneBar, /Choose one option - total is the delivered cash price for that unit/);
    assert.match(copy.warranties.join("\n"), /One-Trip carries a 10-year/);
    assert.doesNotMatch(copy.warranties.join("\n"), /warranty warranty/i);
    assert.doesNotMatch(copy.pricing.join("\n") + copy.notes, /\bposted\b/i);
    assert.doesNotMatch(copy.pricing.join("\n") + copy.notes, /\bdelivery\s+\$?\d/i);
    assert.doesNotMatch(copy.pricing.join("\n") + copy.chooseOneBar, /1850|1800|2400|6050/);
  });

  it("renders three-option PDF bytes with A/B/C cards and no cost leak", async () => {
    const bytes = await generateClientPDF(threeOptions, {
      intro: "We've put together three clear options so you can pick the single unit that best fits your needs.",
      whatToExpect: ["Air and water leak tested before it leaves the depot."],
      closing: "Reply with Option A, Option B, or Option C.",
    });
    const text = pdfPlainText(bytes);
    assert.match(text, /CONTAINER PROPOSAL/);
    assert.match(text, /THREE OPTIONS/);
    assert.doesNotMatch(text, /TWO OPTIONS/);
    assert.match(text, /Option A - Wind & Water Tight/);
    assert.match(text, /Option B - Wind & Water Tight/);
    assert.match(text, /Option C - One-Trip/);
    assert.match(text, /\$3,250\.00/);
    assert.match(text, /\$3,200\.00/);
    assert.match(text, /\$4,100\.00/);
    assert.match(text, /Option C - 40 ft One-Trip \(each\)/);
    assert.match(text, /Choose one option - total is the delivered cash price for that unit/);
    assert.match(text, /three clear options/);
    assert.doesNotMatch(text, /posted 1850|posted \$1,850/i);
    assert.doesNotMatch(text, /delivery 600|delivery \$600/i);
    assert.doesNotMatch(text, /wholesale/i);
    assert.doesNotMatch(text, /warranty warranty/i);
  });
});
