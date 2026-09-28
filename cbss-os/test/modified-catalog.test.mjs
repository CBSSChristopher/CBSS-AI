import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  MODIFIED_CATEGORIES,
  MODIFIED_ITEMS,
  buildModifiedSpec,
  catalogOffersModifications,
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

  it("offers yard mods so a build routes to a human", () => {
    assert.equal(catalogOffersModifications(), true);
    assert.ok(MODIFIED_ITEMS.some((item) => item.product === "yard-mod" && /door|window|fram|insul/i.test(item.name + item.category)));
    const prompt = readFileSync(new URL("../../docs/harbor-kb/01-system-prompt.md", import.meta.url), "utf8").split("```")[1];
    assert.match(prompt, /BUILD TEAM/);
    assert.match(prompt, /Oh, we build those, we've got a whole team that does custom work/);
    assert.match(prompt, /people weld on them and cut openings all the time/i);
    assert.match(prompt, /cleaner and straighter/);
    assert.match(prompt, /extra foot of height/);
    assert.match(prompt, /framing it back in so the box stays strong/);
    assert.match(prompt, /permits and zoning/);
    assert.match(prompt, /Do not promise the box meets any code/);
    assert.match(prompt, /harbor_build_lead/);
    assert.match(prompt, /Most modification work is done in-house/);
    assert.match(prompt, /hunting cabins/);
    assert.match(prompt, /outdoor kitchens/);
    assert.match(prompt, /large assembly buildings/);
    assert.match(prompt, /specialty units/);
    assert.match(prompt, /six-point project brief is only for a caller who brings up a custom or modified project/);
    assert.match(prompt, /In the first 30 seconds ask at most one question/);
    assert.match(prompt, /ask only one question per turn/);
    assert.match(prompt, /Site and access are two questions/);
    assert.match(prompt, /A plain container buyer never hears the project brief/);
    assert.match(prompt, /design team will fill in the rest on a follow-up/);
    assert.doesNotMatch(prompt, /Ask one or two points/);
    assert.doesNotMatch(prompt, /What size are you looking at, and what are you using it for/);
    assert.match(prompt, /call harbor_build_lead once, in that later turn/);
    assert.match(prompt, /Do not invent a callback number/);
    assert.match(prompt, /Do not call harbor_needs_human for a build/);
    assert.match(prompt, /Do not quote an APR, an interest rate, a monthly payment, approval odds, or a credit requirement/);
    assert.match(prompt, /base grade/);
    assert.match(prompt, /dream sketch/);
    assert.match(prompt, /If the budget's tight, we've got Flex Buy/);
    assert.match(prompt, /6, 12, 24, 48, or 72-month plans/);
    assert.match(prompt, /extended mortgage-style terms up to 50 years/);
    assert.match(prompt, /Standard units start at just 10% down plus delivery/);
    assert.match(prompt, /Back office will run the numbers and send the options/);
    assert.match(prompt, /Flex Buy interest: yes/);
    assert.doesNotMatch(prompt, /\b(12|15|18|21|24)\s*%/);
    assert.match(prompt, /Do not describe a rendering, a design board, or a picture as a finished build/);
    assert.doesNotMatch(prompt, /not in this prompt yet/);
    const buildTeam = prompt.slice(prompt.indexOf("BUILD TEAM"), prompt.indexOf("SITE PREP AND PAINT"));
    assert.doesNotMatch(buildTeam, /\$\d/);
    assert.match(prompt, /SITE PREP AND PAINT/);
    assert.match(prompt, /doors open and close square/);
    assert.match(prompt, /10 ft of width, 13 ft of vertical clearance, and 130 ft of stretch/);
    assert.match(prompt, /include the truck room in that same answer/);
    assert.match(prompt, /direct-to-metal or industrial metal paint/);
    assert.doesNotMatch(prompt, /harbor_needs_human with the build details/);
    const buildKb = readFileSync(new URL("../../docs/harbor-kb/17-build-team.md", import.meta.url), "utf8");
    assert.match(buildKb, /Six-point project brief/);
    assert.match(buildKb, /Most of the modification work is done in-house/);
    assert.match(buildKb, /Flex Buy interest: yes/);
    assert.match(buildKb, /72-month plans/);
    assert.doesNotMatch(buildKb, /\b(12|15|18|21|24)\s*%/);
    assert.match(buildKb, /no roster or routing entry/);
    assert.match(buildKb, /Site prep and paint/);
    assert.doesNotMatch(buildKb, /empty on purpose/);
    assert.doesNotMatch(buildKb, /\$\d/);
    assert.doesNotMatch(buildKb, /Allen King|Shawn Chupik|David Hopper|Tucker-Hunt|Gladstone|Promolont/);
    assert.doesNotMatch(prompt, /\b(Christopher|Bryan|Brian)\b/);
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
