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
    assert.match(page, /data-mod="modified"/);
    assert.match(page, /data-mod="money"/);
    assert.match(page, /Call scraps/);
    assert.match(page, /Proposal Builder/);
    assert.match(page, /Write the proposal/);
    assert.match(page, /Pick the box/);
    assert.match(page, /Proposal amount/);
    assert.match(page, /Proposal each/);
    assert.match(page, /Get CBSS Price/);
    assert.doesNotMatch(page, /Match posted wholesale/);
    assert.match(page, /id="p-ticket"/);
    assert.match(page, /class="card step"/);
    assert.doesNotMatch(page, /Find posted box/);
    assert.doesNotMatch(page, /Cash on the ticket/);
    assert.doesNotMatch(page, /Cash each/);
    assert.doesNotMatch(page, /cash price/i);
    assert.match(page, /Invoice — ACH \/ wire only/);
    assert.doesNotMatch(page, /Veem payment request/);
    assert.match(page, /data-desk="chat"/);
    assert.match(page, /Pull Container One/);
    assert.match(page, /Pull USA Containers/);
    assert.match(page, /All owners/);
    assert.match(page, /Complete/);
    assert.match(page, /Schedule another/);
    assert.match(page, /Just completed\. Set the next follow-up\./);
    assert.match(page, /The new follow-up stays on the book/);
    assert.match(page, /grid-template-columns: repeat\(11,/);
    assert.match(page, /id="desk-q"/);
    assert.match(page, /id="desk-hits"/);
    assert.match(page, /id="desk-sel"/);
    assert.match(page, /id="desk-clear"/);
    assert.match(page, /id="desk-new"/);
    assert.match(page, /id="desk-new-open"/);
    assert.match(page, /id="n-save"/);
    assert.match(page, /Is this CTE or follow-up\?/);
    assert.match(page, /Working contact/);
    assert.match(page, /function pickDeskContact/);
    assert.match(page, /function renderDeskHits/);
    assert.match(page, /data-contact/);
    assert.match(page, /pointerdown/);
    assert.match(page, /contactId: String\(deskContact\.id\)/);
    assert.doesNotMatch(page, /closest\("\[data-desk\]"\)/);
    assert.match(page, />Call</);
    assert.match(page, />Text</);
    assert.match(page, />Email</);
    assert.match(page, /Add to email campaign/);
    assert.match(page, /Email campaign/);
    assert.ok(TEAM_OWNERS.includes("Derrek Clements"));
    assert.ok(TEAM_OWNERS.includes("Brittni Keeling"));
    assert.ok(TEAM_OWNERS.includes("Kyle Hodgkiss"));
    assert.ok(!TEAM_OWNERS.includes("Ivyanna"));
    assert.match(page, /Kyle Hodgkiss/);
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

  it("is The Yard and does not deploy over the live backends", () => {
    assert.match(readme, /does \*\*not\*\* deploy over/);
    assert.match(page, />The Yard</);
    assert.match(page, /Open The Yard/);
    assert.match(page, /This is The Yard/);
    assert.match(page, /cbss-yard\.cbss\.workers\.dev/);
    assert.doesNotMatch(page, /theyard\.cbshippingsolutions\.app/);
    assert.doesNotMatch(page, /not a workers\.dev link/);
    assert.doesNotMatch(page, /CBSS Platform/);
    assert.doesNotMatch(page, /side platform/);
    assert.match(wrangler, /"name": "cbssos"/);
    assert.doesNotMatch(wrangler, /"name": "cbss(crm|brain|completetool|pay|invoice)"/);
    assert.match(index, /\/x\/crm/);
    assert.match(index, /\/x\/desk/);
    assert.match(index, /\/x\/proposal/);
    assert.match(index, /\/x\/pay/);
    assert.match(index, /\/x\/invoice/);
    assert.match(index, /\/quote\/match/);
    assert.match(index, /\/geo\/zip/);
    assert.match(index, /\/facebook\/status/);
    assert.match(index, /\/facebook\/save/);
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

describe("Safari can open The Yard", () => {
  it("clears cached HTTP/3 so Windows Chrome does not fail the handshake", () => {
    assert.match(index, /"Alt-Svc": "clear"/);
  });

  it("lets Cloudflare finish so Safari does not sit on a spinning tab", () => {
    assert.match(index, /static\.cloudflareinsights\.com/);
    assert.match(index, /challenges\.cloudflare\.com/);
    assert.match(index, /cloudflareinsights\.com/);
    assert.doesNotMatch(index, /img-src 'none'/);
    assert.match(index, /script-src 'self' 'unsafe-inline'/);
  });

  it("sizes the login for WebKit instead of locking html to height 100%", () => {
    assert.match(page, /-webkit-fill-available/);
    assert.match(page, /display: -webkit-flex/);
    assert.match(page, /id="login"/);
    assert.match(page, /Turn JavaScript on in Safari/);
    assert.doesNotMatch(page, /html, body \{ height: 100%; margin: 0; \}/);
    assert.match(page, /e\.target\.submit\(\)/);
    assert.match(page, /catch \(err\) \{\s*show\("login"\)/);
  });
});

describe("The Yard CRM edit and Money invoice send", () => {
  it("shows stage and the same edit fields as the other CRM", () => {
    assert.match(page, /<th>Stage<\/th>/);
    assert.match(page, /id="crm-edit"/);
    assert.match(page, /id="contact-edit"/);
    assert.match(page, /id="crm-stage"/);
    assert.match(page, /function contactStage/);
    assert.match(page, /function openContactEdit/);
    assert.match(page, /function persistContactPatch/);
    assert.match(page, /function fillNameList/);
    assert.match(page, /<select id="m-name"><\/select>/);
    assert.match(page, /<select id="m-owner"><\/select>/);
    assert.doesNotMatch(page, /id="m-owner-list"/);
    assert.match(page, /action:"appendNote"/);
    assert.match(page, /tag:"Book"/);
    assert.doesNotMatch(page, /audit|security|liability|changelog/i);
    assert.match(page, /action:"saveContactEdits"/);
    assert.match(page, /action:"saveDeals"/);
    for (const stage of [
      "New Lead",
      "Contacted",
      "CTE in progress",
      "Follow up in progress",
      "Email campaign",
      "Quote",
      "Proposal Sent",
      "Flex Buy",
      "Won",
      "Lost",
      "DNC",
    ]) {
      assert.match(page, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    for (const id of [
      "m-name",
      "m-email",
      "m-phone",
      "m-city",
      "m-state",
      "m-zip",
      "m-company",
      "m-owner",
      "m-status",
      "m-source",
      "m-client",
      "m-size",
      "m-condition",
      "m-depot",
      "m-delivery",
      "m-payment",
      "m-amount",
      "m-invoice-paid",
      "m-wholesale",
      "m-dnc",
    ]) {
      assert.match(page, new RegExp('id="' + id + '"'));
    }
    assert.match(page, />Proposal amount</);
    assert.match(page, />Invoice paid</);
    assert.match(page, /they paid the invoice/);
    assert.match(page, /they have not paid the invoice/);
    assert.match(page, /Quote Form/);
    assert.match(page, /Drive Deals/);
    assert.match(page, /Proposal Tool/);
    assert.match(page, /<option value="Desk">Desk<\/option>/);
    assert.match(page, /Residential/);
    assert.match(page, /Commercial/);
    assert.match(page, /20STD/);
    assert.match(page, /40HC/);
    assert.match(page, /New\/Unassigned/);
    const officeChristopher = ["christopher", "cbshippingsolutions.com"].join("@");
    assert.doesNotMatch(page, new RegExp(officeChristopher.replace(/\./g, "\\.")));
  });

  it("builds the invoice and opens Gmail to the agent", () => {
    assert.match(page, /function agentInvoiceGmail/);
    assert.match(page, /function makeInvoice/);
    assert.match(page, /function showInvoiceDoc/);
    assert.match(page, /Send invoice to me/);
    assert.match(page, /id="i-preview"/);
    assert.match(page, /id="i-gmail"/);
    assert.match(page, /\/x\/invoice\/invoice\/create/);
    assert.match(page, /\/x\/invoice\/invoice\/document\//);
    assert.match(page, /PDF downloaded\. Gmail opened — attach /);
    assert.match(page, /id="i-download-pdf"/);
    assert.match(page, /lastDoc\+"\.pdf"/);
    assert.match(page, /function downloadInvoicePdf/);
    assert.match(page, /officeMail\("christopher"\)/);
    assert.match(page, /officeMail\("aliyah"\)/);
    assert.match(index, /invoice\/document\//);
    assert.match(index, /frame-ancestors 'self'/);
    const officeChristopher = ["christopher", "cbshippingsolutions.com"].join("@");
    assert.doesNotMatch(index, new RegExp(officeChristopher.replace(/\./g, "\\.")));
  });
});
