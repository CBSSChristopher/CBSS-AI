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
    assert.match(home, /Save 20% on delivery/);
    assert.match(home, /Request information/);
    assert.match(home, /Better Business Bureau/);
    assert.match(home, /job or the homestead/);
    assert.match(home, /Home &amp; farm|residential is welcome/i);
    assert.match(home, /one-stop shop/i);
    assert.match(all, /cbshippingsolutions\.app/);
    assert.match(all, /CBGC LLC/);
    assert.match(all, /href="\/request"/);
    assert.match(all, /href="\/business"/);
    assert.match(all, /href="\/residential"/);
    assert.match(all, /href="\/services"/);
    assert.match(pages.find((p) => p.f === "about.html").t, /Years in the trade/);
    assert.match(pages.find((p) => p.f === "about.html").t, /Email the office at/);
    assert.doesNotMatch(pages.find((p) => p.f === "about.html").t, /stays on @/);
    assert.doesNotMatch(pages.find((p) => p.f === "about.html").t, /office address is/);
    assert.match(pages.find((p) => p.f === "delivery.html").t, /tilt-bed/);
    assert.match(pages.find((p) => p.f === "services.html").t, /Import and export/);
  });

  it("does not publish a catalog price or lean on cash language", () => {
    assert.doesNotMatch(all, /do not invent/i);
    assert.doesNotMatch(all, /invent a wholesale/i);
    assert.doesNotMatch(all, /catalog fiction/i);
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
    assert.match(js, /\/brand\/mark\.webp/);
    assert.match(js, /\/brand\/bbb-accredited\.webp/);
    assert.doesNotMatch(js, /brand-mark" viewBox/);
    assert.match(pages.find((p) => p.f === "index.html").t, /\/brand\/lockup\.webp/);
    assert.match(pages.find((p) => p.f === "request.html").t, /requestForm/);
  });

  it("clears cached HTTP/3 so Windows Chrome does not drop the connection", () => {
    const worker = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
    assert.match(worker, /"Alt-Svc": "clear"/);
  });

  it("does not wait on Google Fonts or a 180KB stamp favicon", () => {
    assert.doesNotMatch(all, /fonts\.googleapis\.com/);
    assert.doesNotMatch(all, /fonts\.gstatic\.com/);
    const home = pages.find((p) => p.f === "index.html").t;
    assert.match(home, /rel="preload" href="\/brand\/lockup\.webp"/);
    assert.match(home, /href="\/favicon\.svg"/);
    assert.doesNotMatch(home, /rel="icon" href="\/brand\/stamp\.png"/);
    assert.match(pages.find((p) => p.f === "styles.css").t, /font-display:\s*optional/);
    assert.match(pages.find((p) => p.f === "styles.css").t, /\/fonts\/fraunces-600\.woff2/);
  });
});
