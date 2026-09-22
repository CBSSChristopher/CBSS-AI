import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  MODIFIED_CATEGORIES,
  MODIFIED_ITEMS,
  buildModifiedSpec,
  findModifiedItem,
  itemsInCategory,
  readModifiedDraft,
} from "../src/modified-catalog.ts";
import { pageHtml } from "../src/page.ts";
import { MODULES } from "../src/brand.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("Modified container catalog", () => {
  it("covers doors, roll-up, windows, electrical, insulation, framing, and Apex helical pylons", () => {
    const cats = MODIFIED_CATEGORIES.map((c) => c.id);
    for (const id of ["foundation", "doors", "rollup", "windows", "framing", "insulation", "electrical", "climate", "finish"]) {
      assert.ok(cats.includes(id), id);
    }
    const apex = findModifiedItem("apex-helical");
    assert.equal(apex?.product, "apex");
    assert.match(apex.spec, /Helical pylons/);
    assert.match(apex.spec, /frost heave/);
    assert.ok(itemsInCategory("doors").some((item) => /personnel/i.test(item.name)));
    assert.ok(itemsInCategory("rollup").some((item) => /8×8/.test(item.name)));
    assert.ok(itemsInCategory("windows").some((item) => /Egress/.test(item.name)));
    assert.ok(itemsInCategory("electrical").some((item) => /100A/.test(item.name)));
    assert.ok(itemsInCategory("insulation").some((item) => /spray foam/i.test(item.name)));
    assert.ok(itemsInCategory("framing").some((item) => /Steel stud/.test(item.name)));
  });

  it("does not invent a modification price", () => {
    const blob = JSON.stringify(MODIFIED_ITEMS) + JSON.stringify(MODIFIED_CATEGORIES);
    assert.doesNotMatch(blob, /\$\d/);
    assert.doesNotMatch(blob, /price/i);
    const spec = buildModifiedSpec({
      size: "40",
      height: "HC",
      grade: "CW",
      use: "home",
      zip: "72401",
      items: [{ id: "apex-helical", qty: "1" }, { id: "rollup-8x8", qty: "1" }],
      apexPiles: "8",
      apexNote: "Land walk still due",
    });
    assert.equal(spec.ok, true);
    assert.equal(spec.hasApex, true);
    assert.match(spec.title, /CB Apex/);
    assert.match(spec.text, /Roll-up door 8×8/);
    assert.match(spec.text, /8 pylons from the land walk/);
    assert.doesNotMatch(spec.text, /\$\d/);
  });

  it("drops unknown SKUs and empty builds", () => {
    const empty = buildModifiedSpec({});
    assert.equal(empty.ok, false);
    assert.match(empty.error || "", /Pick the box/);
    const draft = readModifiedDraft({
      size: "20",
      items: [{ id: "not-a-sku", qty: "9" }, { id: "door-36-steel", qty: "2", note: "Left wall" }],
    });
    assert.equal(draft.items?.length, 1);
    assert.equal(draft.items?.[0].id, "door-36-steel");
    const spec = buildModifiedSpec(draft);
    assert.equal(spec.ok, true);
    assert.match(spec.text, /36 in steel personnel door × 2/);
    assert.doesNotMatch(spec.text, /not-a-sku/);
  });
});

describe("Modified section on The Yard", () => {
  it("puts Modified on the nav and writes a spec to CRM", () => {
    assert.ok(MODULES.includes("Modified"));
    assert.match(page, /data-mod="modified"/);
    assert.match(page, /id="mod-modified"/);
    assert.match(page, /Modified container/);
    assert.match(page, /CB Apex foundation/);
    assert.match(page, /helical pylons/i);
    assert.match(page, /id="x-catalog"/);
    assert.match(page, /id="x-'\+cat.id/);
    assert.match(page, /id="x-ticket"/);
    assert.match(page, /id="x-save"/);
    assert.match(page, /Do not invent a price/);
    assert.match(page, /api\("\/modified\/spec"/);
    assert.match(index, /path === "\/modified\/spec"/);
    assert.match(index, /buildModifiedSpec/);
    assert.match(index, /tag: "Modified"/);
  });
});
