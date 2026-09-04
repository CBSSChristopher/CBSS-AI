import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { YARD_PUBLIC } from "../src/brand.ts";

const floor = readFileSync(new URL("../src/yard-floor.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.cbss-yard.jsonc", import.meta.url), "utf8");

describe("Safari floor on workers.dev", () => {
  it("serves The Yard on cbss-yard.cbss.workers.dev with no .app redirect", () => {
    assert.equal(YARD_PUBLIC, "https://floor.cbshippingsolutions.app");
    assert.match(wrangler, /"name": "cbss-yard"/);
    assert.match(wrangler, /src\/yard-floor\.ts/);
    assert.match(wrangler, /"service": "cbssos"/);
    assert.doesNotMatch(wrangler, /cbshippingsolutions\.app/);
    assert.doesNotMatch(wrangler, /custom_domain/);
    assert.match(floor, /env\.HOUSE\.fetch/);
    assert.doesNotMatch(floor, /Response\.redirect/);
    assert.doesNotMatch(floor, /cbshippingsolutions\.app/);
  });
});
