import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapOfferCondition,
  matchPostedBox,
  parseOfferSpec,
  rateSheetSize,
  specsCompatible,
} from "../src/xchange-match.ts";

const littleRock = { lat: 34.7465, lon: -92.2896, place: "Little Rock, AR" };

const offers = [
  { size: "20DC", condition: "New", depot: "New Orleans, LA", city: "New Orleans", location: "New Orleans, LA", wholesaleCost: 1675, qty: 75, lat: 29.9511, lon: -90.0715 },
  { size: "40HC", condition: "New", depot: "Memphis, TN", city: "Memphis", location: "Memphis, TN", wholesaleCost: 2100, qty: 12, lat: 35.15, lon: -90.05 },
  { size: "40HC", condition: "Wind & Watertight (WWT)", depot: "Chicago, IL", city: "Chicago", location: "Chicago, IL", wholesaleCost: 1850, qty: 4, lat: 41.88, lon: -87.63 },
  { size: "40HC Open Side 4 Doors", condition: "New", depot: "Norfolk, VA", city: "Norfolk", location: "Norfolk, VA", wholesaleCost: 5000, qty: 21, lat: 36.85, lon: -76.29 },
  { size: "40DC", condition: "CW", depot: "Memphis, TN", city: "Memphis", location: "Memphis, TN", wholesaleCost: 1600, qty: 6, lat: 35.15, lon: -90.05 },
];

describe("xChange posted match", () => {
  it("maps live condition strings", () => {
    assert.equal(mapOfferCondition("New"), "OneTrip");
    assert.equal(mapOfferCondition("Wind & Watertight (WWT)"), "WWT");
    assert.equal(mapOfferCondition("CW"), "CW");
    assert.equal(mapOfferCondition("IICL (older)"), "IICL");
    assert.equal(mapOfferCondition("AS IS"), "AsIs");
  });

  it("does not treat 40DC as 40HC or OS 4D as standard", () => {
    assert.equal(parseOfferSpec("40HC").height, "HC");
    assert.equal(parseOfferSpec("40DC").height, "DC");
    assert.equal(parseOfferSpec("40HC Open Side 4 Doors").config, "side-os-4d");
    assert.equal(specsCompatible({ size: "40", height: "HC", config: "standard", grade: "OneTrip" }, parseOfferSpec("40DC")), false);
    assert.equal(specsCompatible({ size: "40", height: "HC", config: "standard", grade: "OneTrip" }, parseOfferSpec("40HC Open Side 4 Doors")), false);
  });

  it("uses ZIP to pick the nearest city that posted that exact box", () => {
    const hit = matchPostedBox(offers, { size: "40", height: "HC", config: "standard", grade: "OneTrip" }, littleRock, 1, "pickup");
    assert.equal(hit.ok, true);
    assert.equal(hit.wholesale, 2100);
    assert.equal(hit.city, "Memphis, TN");
    assert.ok(hit.miles != null && hit.miles < 200);
  });

  it("does not take a cheaper wrong-size New Orleans box", () => {
    const hit = matchPostedBox(offers, { size: "40", height: "HC", config: "standard", grade: "OneTrip" }, littleRock, 1, "pickup");
    assert.notEqual(hit.wholesale, 1675);
  });

  it("does not treat a 10 as a 20 or a 45 as a 40 for posted match", () => {
    assert.equal(parseOfferSpec("10DC").size, "10");
    assert.equal(parseOfferSpec("45HC").size, "45");
    assert.equal(specsCompatible({ size: "10", height: "DC", config: "standard", grade: "CW" }, parseOfferSpec("20DC")), false);
    assert.equal(specsCompatible({ size: "45", height: "HC", config: "standard", grade: "CW" }, parseOfferSpec("40HC")), false);
    const twenty = [
      { size: "20DC", condition: "CW", depot: "Memphis, TN", city: "Memphis", location: "Memphis, TN", wholesaleCost: 900, qty: 4, lat: 35.15, lon: -90.05 },
    ];
    const miss10 = matchPostedBox(twenty, { size: "10", height: "DC", config: "standard", grade: "CW" }, littleRock, 1, "pickup");
    assert.equal(miss10.ok, false);
    const forty = [
      { size: "40HC", condition: "CW", depot: "Memphis, TN", city: "Memphis", location: "Memphis, TN", wholesaleCost: 1600, qty: 6, lat: 35.15, lon: -90.05 },
    ];
    const miss45 = matchPostedBox(forty, { size: "45", height: "HC", config: "standard", grade: "CW" }, littleRock, 1, "pickup");
    assert.equal(miss45.ok, false);
  });

  it("maps 10→20ft and 45→40ft on the delivery rate sheet only", () => {
    assert.equal(rateSheetSize("10", "standard"), "20ft");
    assert.equal(rateSheetSize("45", "standard"), "40ft");
    assert.equal(rateSheetSize("20", "standard"), "20ft");
    assert.equal(rateSheetSize("40", "standard"), "40ft");
  });

  it("fails closed when that grade is not posted nearby", () => {
    const hit = matchPostedBox(offers, { size: "20", height: "HC", config: "standard", grade: "WWT" }, littleRock, 1, "pickup");
    assert.equal(hit.ok, false);
    assert.match(hit.error || "", /Do not invent/);
  });
});
