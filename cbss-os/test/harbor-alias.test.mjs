import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const alias = readFileSync(new URL("../src/harbor-alias.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.harbor.jsonc", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");

describe("Harbor public name", () => {
  it("keeps the house tool on its own worker and does not overwrite live tools", () => {
    assert.match(wrangler, /"name": "harbor"/);
    assert.match(wrangler, /src\/harbor-alias\.ts/);
    assert.match(alias, /cbssos\.cbss\.workers\.dev/);
    assert.doesNotMatch(wrangler, /"name": "cbss(crm|brain|completetool|pay|invoice)"/);
    assert.match(page, /Open Harbor/);
    assert.match(page, /This is Harbor/);
  });
});
