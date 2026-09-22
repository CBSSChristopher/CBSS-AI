import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  HARBOR_NOTIFY_EMAILS,
  harborCashQuote,
  harborQuoteAuthed,
  harborWorkflowAuthed,
  harborQuoteFromMatch,
  harborQuoteWant,
  handleHarborQuote,
  handleHarborReadyToBuy,
  normalizeHarborZip,
  planHarborReadyToBuyNotify,
  spokenHarborNoMatch,
} from "../src/va/harbor-quote.ts";
import { matchPostedBox } from "../src/xchange-match.ts";
import { dialGate } from "../src/va/status.ts";
import { rosterCompanyEmail } from "../src/cycle/rep.ts";

const CHRISTOPHER_MAIL = rosterCompanyEmail("Christopher Banks");
const BRYAN_MAIL = rosterCompanyEmail("Bryan Reese");

const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const kb14 = readFileSync(new URL("../../docs/harbor-kb/14-zip-proposal-tooling.md", import.meta.url), "utf8");
const kb15 = readFileSync(new URL("../../docs/harbor-kb/15-elevenlabs-tools.md", import.meta.url), "utf8");
const kbWorkflow = readFileSync(new URL("../../docs/harbor-kb/15-sales-rep-workflow.md", import.meta.url), "utf8");

const TOKEN = "harbor-quote-test-token";
const littleRock = { lat: 34.7465, lon: -92.2896, place: "Little Rock, AR" };

function env(over = {}) {
  return {
    VA_ENABLED: "false",
    VA_DIAL_ARMED: "false",
    HARBOR_QUOTE_TOKEN: TOKEN,
    ...over,
  };
}

function req(path, { token, bearer, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Harbor-Token"] = token;
  if (bearer) headers.Authorization = "Bearer " + bearer;
  return new Request("https://floor.cbshippingsolutions.app" + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
}

const posted40 = [
  {
    size: "40HC",
    condition: "CW",
    depot: "Memphis, TN",
    location: "Memphis, TN",
    wholesaleCost: 1850,
    qty: 4,
  },
];

describe("Harbor ZIP quote helpers", () => {
  it("normalizes ZIP and defaults the same box as /quote/match", () => {
    assert.equal(normalizeHarborZip("72201-1234"), "72201");
    assert.equal(normalizeHarborZip("12"), "12");
    const want = harborQuoteWant({});
    assert.deepEqual(want, { size: "40", height: "HC", config: "standard", grade: "CW", qty: 1, fulfillment: "deliver" });
  });

  it("builds cash from posted wholesale only — never invents when wholesale is missing", () => {
    assert.equal(harborCashQuote(0, 475), 0);
    assert.equal(harborCashQuote(-1, 475), 0);
    const cash = harborCashQuote(1850, 475, 700);
    assert.equal(cash, Math.ceil((1850 + 475 + 700) / 25) * 25);
    assert.ok(cash > 1850);
    const miss = matchPostedBox([], { size: "40", height: "HC", config: "standard", grade: "CW" }, littleRock, 1, "deliver");
    const out = harborQuoteFromMatch(miss, littleRock, "72201", harborQuoteWant({}));
    assert.equal(out.ok, false);
    assert.equal(out.reason, "no_match");
    assert.equal(out.unit_price, null);
    assert.equal(out.box, null);
    assert.equal(out.dialing, false);
    assert.match(out.spoken_summary, /will not invent a price/i);
  });

  it("speaks the posted cash quote after the same matchPostedBox hit", () => {
    const want = harborQuoteWant({ size: "40", height: "HC", grade: "CW" });
    const hit = matchPostedBox(posted40, want, littleRock, 1, "deliver");
    assert.equal(hit.ok, true);
    const out = harborQuoteFromMatch(hit, littleRock, "72201", want);
    assert.equal(out.ok, true);
    assert.equal(out.unit_price, harborCashQuote(hit.wholesale, hit.delivery));
    assert.equal(out.box.wholesale, 1850);
    assert.equal(out.zip, "72201");
    assert.equal(out.place, "Little Rock, AR");
    assert.equal(out.dialing, false);
    assert.equal(out.sms, false);
    assert.match(out.spoken_summary, /\$/);
    assert.doesNotMatch(out.spoken_summary, /invent/i);
    assert.match(spokenHarborNoMatch("72201", "Little Rock, AR", "no_match"), /No posted CBSS match/);
  });

  it("accepts X-Harbor-Token or Bearer and rejects missing/wrong tokens", () => {
    assert.equal(harborQuoteAuthed(req("/va/harbor/quote", { token: TOKEN }), env()), true);
    assert.equal(harborQuoteAuthed(req("/va/harbor/quote", { bearer: TOKEN }), env()), true);
    assert.equal(harborQuoteAuthed(req("/va/harbor/quote"), env()), false);
    assert.equal(harborQuoteAuthed(req("/va/harbor/quote", { token: "nope" }), env()), false);
    assert.equal(harborQuoteAuthed(req("/va/harbor/quote", { token: TOKEN }), env({ HARBOR_QUOTE_TOKEN: "" })), false);
    assert.equal(harborWorkflowAuthed(req("/va/harbor/get-next-lead", { token: TOKEN }), env()), true);
    assert.equal(harborWorkflowAuthed(req("/va/harbor/log-outcome", { bearer: "hook" }), env({ VA_WEBHOOK_SECRET: "hook" })), true);
    assert.equal(harborWorkflowAuthed(req("/va/harbor/get-next-lead"), env()), false);
  });
});

describe("POST /va/harbor/quote", () => {
  it("returns 401 without a token", async () => {
    const denied = await handleHarborQuote(env(), req("/va/harbor/quote", { body: { zip: "72201" } }));
    assert.equal(denied.status, 401);
    assert.equal(denied.body.ok, false);
    assert.equal(denied.body.dialing, false);
    assert.match(String(denied.body.error), /Harbor quote token/i);
  });

  it("returns 401 when the secret is unset even if a header is sent", async () => {
    const denied = await handleHarborQuote(
      env({ HARBOR_QUOTE_TOKEN: "" }),
      req("/va/harbor/quote", { token: TOKEN, body: { zip: "72201" } }),
    );
    assert.equal(denied.status, 401);
    assert.match(String(denied.body.error), /HARBOR_QUOTE_TOKEN/);
    assert.equal(denied.body.dialing, false);
  });

  it("returns 400 for a bad ZIP and does not invent a price", async () => {
    const bad = await handleHarborQuote(env(), req("/va/harbor/quote", { token: TOKEN, body: { zip: "12" } }));
    assert.equal(bad.status, 400);
    assert.equal(bad.body.ok, false);
    assert.equal(bad.body.unit_price, null);
    assert.match(String(bad.body.error || bad.body.spoken_summary), /5-digit ZIP/i);
    const letters = await handleHarborQuote(env(), req("/va/harbor/quote", { bearer: TOKEN, body: { zip: "abcde" } }));
    assert.equal(letters.status, 400);
    assert.equal(letters.body.unit_price, null);
  });

  it("returns no_match with null unit_price when inventory has no posted box", async () => {
    const miss = await handleHarborQuote(
      env(),
      req("/va/harbor/quote", { token: TOKEN, body: { zip: "72201", size: "10" } }),
      {
        lookupZip: async () => littleRock,
        loadOffers: async () => ({ offers: posted40 }),
      },
    );
    assert.equal(miss.status, 200);
    assert.equal(miss.body.ok, false);
    assert.equal(miss.body.reason, "no_match");
    assert.equal(miss.body.unit_price, null);
    assert.equal(miss.body.dialing, false);
    assert.equal(miss.body.sms, false);
    assert.match(String(miss.body.spoken_summary), /will not invent a price/i);
  });

  it("returns the posted cash quote and never dials", async () => {
    const hit = await handleHarborQuote(
      env(),
      req("/va/harbor/quote", { token: TOKEN, body: { zip: "72201", size: "40", height: "HC", grade: "CW" } }),
      {
        lookupZip: async () => littleRock,
        loadOffers: async () => ({ offers: posted40 }),
      },
    );
    assert.equal(hit.status, 200);
    assert.equal(hit.body.ok, true);
    assert.equal(typeof hit.body.unit_price, "number");
    assert.ok(hit.body.unit_price > 0);
    assert.equal(hit.body.box.wholesale, 1850);
    assert.equal(hit.body.zip, "72201");
    assert.equal(hit.body.place, "Little Rock, AR");
    assert.equal(hit.body.dialing, false);
    assert.equal(hit.body.sms, false);
    assert.match(String(hit.body.spoken_summary), /Posted CBSS quote/);
  });
});

describe("POST /va/harbor/ready-to-buy", () => {
  it("returns 401 without a token and does not notify", async () => {
    let mailed = 0;
    const denied = await handleHarborReadyToBuy(
      env(),
      req("/va/harbor/ready-to-buy", { body: { zip: "72201", contact_name: "Pat" } }),
      { sendMail: async () => { mailed += 1; return { ok: true, messageId: "x", threadId: "t" }; } },
    );
    assert.equal(denied.status, 401);
    assert.equal(mailed, 0);
    assert.equal(denied.body.dialing, false);
    assert.equal(denied.body.sms, false);
  });

  it("returns 400 for a bad ZIP on ready-to-buy", async () => {
    const bad = await handleHarborReadyToBuy(
      env(),
      req("/va/harbor/ready-to-buy", { token: TOKEN, body: { zip: "99", contact_name: "Pat" } }),
    );
    assert.equal(bad.status, 400);
    assert.equal(bad.body.dialing, false);
  });

  it("notifies Christopher + Bryan by email, writes a CRM note on match, and never SMS/dials", async () => {
    const notes = [];
    const mails = [];
    const got = await handleHarborReadyToBuy(
      env(),
      req("/va/harbor/ready-to-buy", {
        token: TOKEN,
        body: {
          zip: "72201",
          size: "40",
          height: "HC",
          grade: "CW",
          contact_name: "Pat Lee",
          phone: "8705550100",
          closer: "Christopher Banks",
          handoff_variant: "accounting",
        },
      }),
      {
        lookupZip: async () => littleRock,
        loadOffers: async () => ({ offers: posted40 }),
        getContacts: async () => [{ id: "c1", name: "Pat Lee", phone: "8705550100", owner: "Harbor", status: "Working", cteStage: "CTE1" }],
        writeNote: async (id, text, edits) => {
          notes.push({ id, text, edits });
          return true;
        },
        sendMail: async (_env, input) => {
          mails.push(input);
          return { ok: true, messageId: "m1", threadId: "t1" };
        },
      },
    );
    assert.equal(got.status, 200);
    assert.equal(got.body.ok, true);
    assert.equal(got.body.dialing, false);
    assert.equal(got.body.sms, false);
    assert.equal(got.body.closer, "Christopher Banks");
    assert.equal(got.body.handoff_variant, "accounting");
    assert.equal(got.body.noteWritten, true);
    assert.deepEqual(got.body.notified, [...HARBOR_NOTIFY_EMAILS]);
    assert.ok(HARBOR_NOTIFY_EMAILS.includes(CHRISTOPHER_MAIL));
    assert.ok(HARBOR_NOTIFY_EMAILS.includes(BRYAN_MAIL));
    assert.equal(notes.length, 1);
    assert.equal(notes[0].id, "c1");
    assert.match(notes[0].text, /Ready to buy/);
    assert.equal(mails.length, 1);
    assert.deepEqual(mails[0].to, [CHRISTOPHER_MAIL, BRYAN_MAIL]);
    assert.doesNotMatch(JSON.stringify(got.body), /twilio|sms sent|texted/i);
    const notify = planHarborReadyToBuyNotify("Bryan Reese");
    assert.deepEqual(notify.to, [CHRISTOPHER_MAIL, BRYAN_MAIL]);
  });
});

describe("Harbor quote rails stay parked", () => {
  it("keeps VA_DIAL_ARMED false and does not commit the quote secret", () => {
    assert.match(wrangler, /"VA_ENABLED": "false"/);
    assert.match(wrangler, /"VA_DIAL_ARMED": "false"/);
    assert.doesNotMatch(wrangler, /HARBOR_QUOTE_TOKEN/);
    const parked = dialGate({ VA_ENABLED: "false", VA_DIAL_ARMED: "false" });
    assert.equal(parked.status, 403);
    assert.equal(parked.body.dialing, false);
  });

  it("wires quote routes without touching /va/dial", () => {
    assert.match(index, /\/va\/harbor\/quote/);
    assert.match(index, /\/va\/harbor\/ready-to-buy/);
    assert.match(index, /\/va\/harbor\/get-next-lead/);
    assert.match(index, /\/va\/harbor\/update-lead/);
    assert.match(index, /\/va\/harbor\/log-outcome/);
    assert.match(index, /handleHarborQuote/);
    const quoteBlock = index.slice(index.indexOf('path === "/va/harbor/quote"'), index.indexOf('path === "/va/email/draft"'));
    assert.doesNotMatch(quoteBlock, /vaDialResponse|twilio|VA_DIAL_ARMED": "true"/i);
    assert.match(kb14, /harbor_quote_by_zip/);
    assert.match(kb14, /HARBOR_QUOTE_TOKEN/);
    assert.match(kb14, /Quote ≠ dial/);
    assert.match(kb15, /harbor_quote_by_zip/);
    assert.match(kb15, /harbor_ready_to_buy/);
    assert.match(kb15, /get_next_lead/);
    assert.match(kb15, /log_outcome/);
    assert.match(kb15, /\/va\/harbor\/quote/);
    assert.match(kb15, /Harbor voice agent/);
    assert.match(kb15, /X-Harbor-Token/);
    assert.match(kb15, /Do \*\*not\*\* wire Cursor MCP/);
    assert.match(kbWorkflow, /get_next_lead/);
    assert.match(kbWorkflow, /Dry-run simulation checklist/);
    assert.match(kbWorkflow, /Twilio import last/);
    assert.match(kbWorkflow, /Do \*\*not\*\* import the Harbor DID/);
    assert.doesNotMatch(kbWorkflow, /From Twilio →|Account SID \+ Auth Token/);
  });
});
