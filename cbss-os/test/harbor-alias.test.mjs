import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { pageHtml } from "../src/page.ts";
import { yardAliasAction } from "../src/harbor-alias.ts";

const alias = readFileSync(new URL("../src/harbor-alias.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.harbor.jsonc", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const page = pageHtml();

describe("The Yard public name", () => {
  it("keeps the house tool on its own worker and does not overwrite live tools", () => {
    assert.match(wrangler, /"name": "theyard"/);
    assert.match(wrangler, /src\/harbor-alias\.ts/);
    assert.match(alias, /env\.HOUSE\.fetch/);
    assert.match(wrangler, /"service": "cbssos"/);
    assert.match(wrangler, /yard\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /theyard\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /crm\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /zone_name": "cbshippingsolutions\.app"/);
    assert.doesNotMatch(wrangler, /custom_domain/);
    assert.match(alias, /YARD_PUBLIC/);
    assert.match(alias, /\.workers\.dev/);
    assert.match(alias, /Response\.redirect/);
    assert.doesNotMatch(wrangler, /"name": "cbss(crm|brain|completetool|pay|invoice)"/);
    assert.match(page, /Open The Yard/);
    assert.match(page, /This is The Yard/);
    assert.match(page, /yard\.cbshippingsolutions\.app/);
    assert.doesNotMatch(page, /theyard\.cbshippingsolutions\.app/);
    assert.match(page, /not a workers\.dev link/);
    assert.match(pageHtml({ loginError: "Type your CRM password." }), /Type your CRM password\./);
    assert.match(index, /loginWantsRedirect/);
    assert.match(index, /pageHtml\(\{ loginError/);
    assert.match(index, /isYardPagePath/);
    assert.match(index, /path === "\/auth\/login"/);
    assert.match(index, /"Alt-Svc": "clear"/);
  });
});

describe("The Yard sign-in on the company hostname", () => {
  it("does not 302 a login POST off workers.dev", () => {
    assert.equal(yardAliasAction("theyard.cbss.workers.dev", "GET"), "redirect");
    assert.equal(yardAliasAction("theyard.cbss.workers.dev", "POST"), "proxy");
    assert.equal(yardAliasAction("yard.cbshippingsolutions.app", "GET"), "proxy");
    assert.equal(yardAliasAction("yard.cbshippingsolutions.app", "POST"), "proxy");
    assert.equal(yardAliasAction("theyard.cbshippingsolutions.app", "GET"), "proxy");
    assert.equal(yardAliasAction("theyard.cbshippingsolutions.app", "POST"), "proxy");
    assert.equal(yardAliasAction("crm.cbshippingsolutions.app", "GET"), "redirect");
    assert.equal(yardAliasAction("crm.cbshippingsolutions.app", "POST"), "proxy");
  });

  it("shows a sign-in error and does not let boot kick them back to login", () => {
    assert.match(page, /id="login-form" method="post" action="\/auth\/login"/);
    assert.match(page, /name="email"/);
    assert.match(page, /name="password"/);
    assert.match(page, /id="login-go"/);
    assert.match(page, /Opening…/);
    assert.match(page, /allow401: true/);
    assert.match(page, /if \(user\) return;/);
    assert.match(page, /Could not sign in\. Try again\./);
    assert.match(index, /readLoginBody/);
    assert.match(index, /status: 303/);
  });
});
