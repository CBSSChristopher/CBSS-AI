import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { pageHtml } from "../src/page.ts";
import alias, { yardAliasAction } from "../src/harbor-alias.ts";

const aliasSrc = readFileSync(new URL("../src/harbor-alias.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.harbor.jsonc", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const page = pageHtml();

const HOUSE = {
  fetch(request) {
    return Promise.resolve(new Response("yard-ok", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }));
  },
};

describe("The Yard public name", () => {
  it("keeps The Yard on its own worker and does not overwrite live tools", () => {
    assert.match(wrangler, /"name": "theyard"/);
    assert.match(wrangler, /src\/harbor-alias\.ts/);
    assert.match(aliasSrc, /env\.HOUSE\.fetch/);
    assert.match(wrangler, /"service": "cbssos"/);
    assert.match(wrangler, /floor\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /go\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /yard\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /theyard\.cbshippingsolutions\.app\/\*/);
    assert.match(wrangler, /zone_name": "cbshippingsolutions\.app"/);
    assert.doesNotMatch(wrangler, /custom_domain/);
    assert.doesNotMatch(aliasSrc, /Response\.redirect/);
    assert.doesNotMatch(aliasSrc, /status:\s*302/);
    assert.doesNotMatch(wrangler, /"name": "cbss(crm|brain|completetool|pay|invoice)"/);
    assert.match(page, /Open The Yard/);
    assert.match(page, /This is The Yard/);
    assert.match(page, /floor\.cbshippingsolutions\.app/);
    assert.doesNotMatch(page, /cbss-yard\.cbss\.workers\.dev/);
    assert.doesNotMatch(page, /theyard\.cbshippingsolutions\.app/);
    assert.doesNotMatch(page, /house tool/i);
    assert.doesNotMatch(page, /the house/i);
    assert.doesNotMatch(page, /not a workers\.dev link/);
    assert.match(pageHtml({ loginError: "Type your CRM password." }), /Type your CRM password\./);
    assert.match(index, /loginWantsRedirect/);
    assert.match(index, /pageHtml\(\{ loginError/);
    assert.match(index, /isYardPagePath/);
    assert.match(index, /path === "\/auth\/login"/);
    assert.match(index, /"Alt-Svc": "clear"/);
  });
});

describe("The Yard sign-in on any hostname", () => {
  it("never 302s workers.dev or custom domains onto *.cbshippingsolutions.app", async () => {
    const hosts = [
      "theyard.cbss.workers.dev",
      "cbss-yard.cbss.workers.dev",
      "cbssos.cbss.workers.dev",
      "floor.cbshippingsolutions.app",
      "go.cbshippingsolutions.app",
      "yard.cbshippingsolutions.app",
      "theyard.cbshippingsolutions.app",
      "crm.cbshippingsolutions.app",
    ];
    for (const host of hosts) {
      assert.equal(yardAliasAction(host, "GET"), "proxy", host);
      assert.equal(yardAliasAction(host, "POST"), "proxy", host);
      const res = await alias.fetch(new Request("https://" + host + "/"), { HOUSE });
      assert.equal(res.status, 200, host);
      assert.equal(res.headers.get("location"), null, host);
    }
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
