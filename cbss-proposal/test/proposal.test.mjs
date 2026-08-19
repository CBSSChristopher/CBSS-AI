import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  customerCashTotal,
  describeContainer,
  mapGrade,
  parseOfferSpec,
  pickClosestDepot,
  rateSheetSize,
  uniqueGrades,
} from "../src/container.js";

const page = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const submit = readFileSync(new URL("../src/submit-proposal.js", import.meta.url), "utf8");

describe("Proposal tool picker, depot, and cash price", () => {
  it("maps messy xChange grades to one CW/WWT/OneTrip/AsIs each", () => {
    assert.equal(mapGrade("Cargo Worthy"), "CW");
    assert.equal(mapGrade("CW"), "CW");
    assert.equal(mapGrade("IICL"), "CW");
    assert.equal(mapGrade("Wind & Water Tight"), "WWT");
    const grades = uniqueGrades(["CW", "Cargo Worthy", "IICL", "WWT", "Wind and Water Tight", "One-Trip", "As-Is"]);
    assert.deepEqual(grades.map((g) => g.value), ["CW", "WWT", "OneTrip", "AsIs"]);
  });

  it("parses size, height, and configuration instead of a crowded size dump", () => {
    assert.deepEqual(parseOfferSpec("40HC"), { size: "40", height: "HC", config: "standard" });
    assert.deepEqual(parseOfferSpec("40' Standard"), { size: "40", height: "DC", config: "standard" });
    assert.deepEqual(parseOfferSpec("20ft DC"), { size: "20", height: "DC", config: "standard" });
    assert.deepEqual(parseOfferSpec("40 HC side door"), { size: "40", height: "HC", config: "side-door" });
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
    assert.doesNotMatch(page, /Find Closest Depots/);
    assert.doesNotMatch(page, /Est\. Delivery/);
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
  });

  it("keeps the login script valid", () => {
    const js = page.split("<script>")[1].split("</script>")[0];
    writeFileSync("/tmp/proposal_page_check.js", js);
    const check = spawnSync("node", ["--check", "/tmp/proposal_page_check.js"], { encoding: "utf8" });
    assert.equal(check.status, 0, check.stderr || check.stdout);
  });
});
