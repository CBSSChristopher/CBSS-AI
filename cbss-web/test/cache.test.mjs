import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cacheControl } from "../src/cache.js";

describe("public site cache", () => {
  it("stores fonts and pictures for a week and revalidates HTML quickly", () => {
    assert.match(cacheControl("/fonts/fraunces-600.woff2", "font/woff2"), /max-age=604800/);
    assert.match(cacheControl("/brand/lockup.webp", "image/webp"), /max-age=604800/);
    assert.match(cacheControl("/styles.css", "text/css"), /max-age=86400/);
    assert.match(cacheControl("/site.js", "text/javascript"), /max-age=86400/);
    assert.match(cacheControl("/", "text/html"), /max-age=120/);
    assert.match(cacheControl("/about", "text/html"), /max-age=120/);
    assert.equal(cacheControl("/api/request", "application/json"), "no-store");
  });
});
