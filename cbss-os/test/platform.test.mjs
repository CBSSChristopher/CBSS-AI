import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { BRAND, LIVE_TOOLS, MODULES, SALES_SPARKS, TEAM_OWNERS } from "../src/brand.ts";
import { emptyTools, isCompanyEmail, makeSession, origins, readSession, toolsReady } from "../src/auth.ts";
import { pageHtml } from "../src/page.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");

describe("CBSS platform brand", () => {
  it("uses navy, gold, cream, Times seal, Helvetica body", () => {
    assert.equal(BRAND.navy, "#0B1F3A");
    assert.equal(BRAND.gold, "#C9A227");
    assert.equal(BRAND.paper, "#F7F4EC");
    assert.match(page, /#0B1F3A/);
    assert.match(page, /#C9A227/);
    assert.match(page, /#F7F4EC/);
    assert.match(page, /Times New Roman/);
    assert.match(page, /Helvetica/);
    assert.match(page, />CB</);
    assert.match(page, /CB SHIPPING SOLUTIONS/);
    assert.match(page, /CBGC LLC DBA CB Shipping Solutions/);
  });

  it("puts all four models in one shell", () => {
    for (const name of MODULES) assert.match(page, new RegExp(name));
    assert.match(page, /data-mod="crm"/);
    assert.match(page, /data-mod="desk"/);
    assert.match(page, /data-mod="proposal"/);
    assert.match(page, /data-mod="money"/);
    assert.match(page, /Call scraps/);
    assert.match(page, /Proposal Builder/);
    assert.match(page, /Invoice — ACH \/ wire only/);
    assert.doesNotMatch(page, /Veem payment request/);
    assert.match(page, /data-desk="chat"/);
    assert.match(page, /Pull Container One/);
    assert.match(page, /Pull USA Containers/);
    assert.match(page, /All owners/);
    assert.match(page, /Complete/);
    assert.match(page, /Schedule another/);
    assert.match(page, /grid-template-columns: repeat\(8,/);
    assert.match(page, />Call</);
    assert.match(page, />Text</);
    assert.match(page, />Email</);
    assert.match(page, /Add to email campaign/);
    assert.match(page, /Email campaign/);
    assert.ok(TEAM_OWNERS.includes("Derrek Clements"));
    assert.ok(TEAM_OWNERS.includes("Brittni Keeling"));
    assert.ok(!TEAM_OWNERS.includes("Ivyanna"));
    assert.match(page, /Derrek Clements/);
    assert.doesNotMatch(page, /"Ivyanna"/);
    assert.match(page, /Your CBSS AI/);
    assert.match(page, /Build the quote\. Send the proposal/);
    assert.match(page, /Invoice the cash they agreed to/);
    assert.doesNotMatch(page, /Own the door type/);
    assert.match(page, /id="sales-spark"/);
    assert.match(page, /viewport-fit=cover/);
    assert.match(page, /apple-mobile-web-app-capable/);
    assert.match(page, /@media \(max-width: 860px\)/);
    assert.match(page, /phone-hide/);
    assert.match(page, /book-split/);
    assert.match(page, /100dvh/);
    assert.match(page, /safe-area-inset/);
    assert.ok(SALES_SPARKS.length >= 8);
    assert.match(page, new RegExp(SALES_SPARKS[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});

describe("hard rules stay on the platform", () => {
  it("does not invent a price and keeps door types separate", () => {
    assert.match(page, /I will not invent a price/);
    assert.match(page, /Do not invent a price/);
    assert.match(page, /Do not invent a wholesale/);
    assert.match(page, /Side door \(OS 2D\)/);
    assert.match(page, /Side door \(OS 4D\)/);
    assert.match(page, /Full open side/);
    assert.match(page, /OS 2D, OS 4D, and Full open side are different boxes/);
    assert.match(page, /This tool does not send from Gmail|This tool does not send Gmail/);
  });

  it("is company email only", () => {
    assert.equal(isCompanyEmail("rep@cbshippingsolutions.com"), true);
    assert.equal(isCompanyEmail("bankschristopher0300@gmail.com"), false);
    assert.match(page, /@cbshippingsolutions\.com/);
    assert.match(page, /Company email only/);
  });

  it("does not replace or deploy over the live tools", () => {
    assert.match(readme, /does \*\*not\*\* replace/);
    assert.match(page, /does not replace the live tools/);
    assert.match(page, /live tools unchanged/);
    assert.match(wrangler, /"name": "cbssos"/);
    assert.doesNotMatch(wrangler, /"name": "cbss(crm|brain|completetool|pay|invoice)"/);
    assert.match(index, /\/x\/crm/);
    assert.match(index, /\/x\/desk/);
    assert.match(index, /\/x\/proposal/);
    assert.match(index, /\/x\/pay/);
    assert.match(index, /\/x\/invoice/);
    assert.match(index, /\/quote\/match/);
    assert.match(index, /\/geo\/zip/);
    assert.equal(origins({}).crm, LIVE_TOOLS.crm);
    assert.equal(origins({}).desk, LIVE_TOOLS.desk);
    assert.equal(origins({}).proposal, LIVE_TOOLS.proposal);
    assert.equal(origins({}).pay, LIVE_TOOLS.pay);
    assert.equal(origins({}).invoice, LIVE_TOOLS.invoice);
  });
});

describe("session stays small", () => {
  it("stores tool cookies in KV so the browser cookie stays under 4KB", async () => {
    const bag = new Map();
    const env = {
      AUTH_SECRET: "platform-test-secret-not-for-production",
      SESSIONS: {
        get: async (key) => bag.get(key) ?? null,
        put: async (key, value) => {
          bag.set(key, value);
        },
        delete: async (key) => {
          bag.delete(key);
        },
      },
    };
    const fat = "x".repeat(800);
    const user = {
      email: "rep@cbshippingsolutions.com",
      name: "Rep",
      tools: { crm: fat, desk: fat, proposal: fat, pay: fat, invoice: fat },
    };
    const request = new Request("https://cbssos.cbss.workers.dev/");
    const cookies = await makeSession(request, env, user);
    assert.ok(cookies[0].length < 800, cookies[0].length);
    const inbound = new Request("https://cbssos.cbss.workers.dev/", {
      headers: { Cookie: cookies[0].split(";")[0] },
    });
    const got = await readSession(inbound, env);
    assert.equal(got?.email, user.email);
    assert.equal(got?.tools.crm.length, 800);
    assert.deepEqual(toolsReady(got.tools), { crm: true, desk: true, proposal: true, pay: true, invoice: true });
    assert.deepEqual(toolsReady(emptyTools()), { crm: false, desk: false, proposal: false, pay: false, invoice: false });
  });
});
