import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { pageHtml } from "../src/page.ts";

const alias = readFileSync(new URL("../src/harbor-alias.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.harbor.jsonc", import.meta.url), "utf8");
const page = pageHtml();

describe("The Yard public name", () => {
  it("keeps the house tool on its own worker and does not overwrite live tools", () => {
    assert.match(wrangler, /"name": "theyard"/);
    assert.match(wrangler, /src\/harbor-alias\.ts/);
    assert.match(alias, /env\.HOUSE\.fetch/);
    assert.match(wrangler, /"service": "cbssos"/);
    assert.match(wrangler, /theyard\.cbshippingsolutions\.app/);
    assert.match(wrangler, /custom_domain": true/);
    assert.match(alias, /YARD_PUBLIC/);
    assert.match(alias, /\.workers\.dev/);
    assert.match(alias, /Response\.redirect/);
    assert.doesNotMatch(wrangler, /"name": "cbss(crm|brain|completetool|pay|invoice)"/);
    assert.match(page, /Open The Yard/);
    assert.match(page, /This is The Yard/);
    assert.match(page, /theyard\.cbshippingsolutions\.app/);
    assert.match(page, /not a workers\.dev link/);
  });
});
