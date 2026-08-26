import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const pub = new URL("../public/", import.meta.url);
const pages = readdirSync(pub)
  .filter((f) => f.endsWith(".html") || f.endsWith(".js") || f.endsWith(".css"))
  .map((f) => ({ f, t: readFileSync(new URL(f, pub), "utf8") }));
const all = pages.map((p) => p.t).join("\n");

describe("CBSS public website", () => {
  it("is a commercial information-request site on the new .app domain", () => {
    const home = pages.find((p) => p.f === "index.html").t;
    assert.match(home, /CBShippingSolutions/);
    assert.match(home, /One inclusive price/);
    assert.match(home, /Request information/);
    assert.match(home, /Better Business Bureau/);
    assert.match(home, /Jobsite and warehouse/);
    assert.match(all, /cbshippingsolutions\.app/);
    assert.match(all, /CBGC LLC/);
    assert.match(all, /href="\/request"/);
    assert.match(all, /href="\/business"/);
  });

  it("does not invent a catalog price or lean on cash language", () => {
    assert.match(all, /do not invent/i);
    assert.doesNotMatch(all, /\$3,180/);
    assert.doesNotMatch(all, /\$2,500/);
    assert.doesNotMatch(all, /\$800\.00/);
    assert.doesNotMatch(all, /card_number/);
    assert.doesNotMatch(all, /cbsscrm|cbssbrain|cbsscompletetool|cbsspay|cbssinvoice/);
    assert.doesNotMatch(all, /One cash number/);
    assert.doesNotMatch(all, /Delivered cash/);
    assert.doesNotMatch(all, /delivered cash/i);
  });

  it("uses the current office phone and a posted request form", () => {
    const js = pages.find((p) => p.f === "site.js").t;
    assert.match(js, /8703232593/);
    assert.doesNotMatch(all, /5735258324/);
    assert.doesNotMatch(all, /573-525-8324/);
    assert.match(js, /\["christopher", "cbshippingsolutions\.com"\]\.join\("@"\)/);
    assert.match(js, /\/api\/request/);
    assert.match(pages.find((p) => p.f === "request.html").t, /requestForm/);
  });
});
