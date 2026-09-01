import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("static pages export", () => {
  it("inlines the brand CSS and keeps pretty URLs for GitHub Pages", () => {
    const dir = mkdtempSync(join(tmpdir(), "cbss-pages-"));
    try {
      const run = spawnSync(process.execPath, ["scripts/build-pages.mjs", dir], {
        cwd: root,
        encoding: "utf8",
      });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const home = readFileSync(join(dir, "index.html"), "utf8");
      assert.match(home, /data-cbss-brand/);
      assert.match(home, /--navy/);
      assert.doesNotMatch(home, /href="\/styles\.css"/);
      assert.match(readFileSync(join(dir, "request", "index.html"), "utf8"), /requestForm/);
      assert.match(readFileSync(join(dir, "CNAME"), "utf8"), /cbshippingsolutions\.app/);
      assert.match(readFileSync(join(dir, "contact", "index.html"), "utf8"), /\/request/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
