import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { inlineBrandCss } from "../src/brand-html.js";

const home = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const worker = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");

describe("inline brand CSS", () => {
  it("puts the navy/gold sheet in the HTML and drops the blocking stylesheet link", () => {
    const out = inlineBrandCss(home, css);
    assert.match(out, /<style data-cbss-brand>/);
    assert.match(out, /--navy: #184a7a/);
    assert.match(out, /\.hero/);
    assert.doesNotMatch(out, /href="\/styles\.css"/);
    assert.match(out, /Containers for the job or the homestead/);
  });

  it("leaves the page alone when the sheet is empty", () => {
    assert.equal(inlineBrandCss(home, ""), home);
    assert.match(worker, /inlineBrandCss/);
  });
});
