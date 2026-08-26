import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const pub = new URL("../public/", import.meta.url);
const pages = readdirSync(pub)
  .filter((f) => f.endsWith(".html") || f.endsWith(".js") || f.endsWith(".css"))
  .map((f) => ({ f, t: readFileSync(new URL(f, pub), "utf8") }));
const all = pages.map((p) => p.t).join("\n");

describe("CBSS public website", () => {
  it("is a quote-first site on the new .app domain", () => {
    const home = pages.find((p) => p.f === "index.html").t;
    assert.match(home, /CBShippingSolutions/);
    assert.match(home, /One cash number/);
    assert.match(home, /Get a real quote/);
    assert.match(home, /Better Business Bureau/);
    assert.match(all, /cbshippingsolutions\.app/);
    assert.match(all, /CBGC LLC/);
  });

  it("does not invent a catalog or wholesale price", () => {
    assert.match(all, /do not invent/i);
    assert.doesNotMatch(all, /\$3,180/);
    assert.doesNotMatch(all, /\$2,500/);
    assert.doesNotMatch(all, /\$800\.00/);
    assert.doesNotMatch(all, /card_number/);
    assert.doesNotMatch(all, /cbsscrm|cbssbrain|cbsscompletetool|cbsspay|cbssinvoice/);
  });

  it("keeps the office phone and company-email quote path", () => {
    const js = pages.find((p) => p.f === "site.js").t;
    assert.match(js, /5735258324/);
    assert.match(js, /\["christopher", "cbshippingsolutions\.com"\]\.join\("@"\)/);
    assert.match(js, /mailto:/);
    assert.match(pages.find((p) => p.f === "quote.html").t, /quoteForm/);
  });
});
