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
  spokenHarborQuote,
  spokenHarborGrade,
  spokenHarborWarranty,
  HARBOR_QUOTE_WAIT_LINE,
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
const kb01 = readFileSync(new URL("../../docs/harbor-kb/01-system-prompt.md", import.meta.url), "utf8");
const kb07 = readFileSync(new URL("../../docs/harbor-kb/07-product.md", import.meta.url), "utf8");
const kb16 = readFileSync(new URL("../../docs/harbor-kb/16-new-hire-call-sheet.md", import.meta.url), "utf8");

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
    assert.match(out.spoken_summary, /don.?t have a posted number/i);
    assert.doesNotMatch(out.spoken_summary, /make it up|invent|cards are frozen/i);
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
    assert.match(out.spoken_summary, /Thanks for being patient with me/);
    assert.match(out.spoken_summary, /40FT high cube container/);
    assert.match(out.spoken_summary, /cargo worthy/);
    assert.match(out.spoken_summary, /5-year structural and 5-year no-leak warranty/);
    assert.match(out.spoken_summary, /delivered, is going to be \$/);
    assert.doesNotMatch(out.spoken_summary, /wind and water|10-year/i);
    assert.doesNotMatch(out.spoken_summary, /make it up|invent|proposal tool|cards are frozen/i);
    assert.match(spokenHarborNoMatch("72201", "Little Rock, AR", "no_match"), /don.?t have a posted number/);
  });

  it("speaks the floor-card warranty matrix from the tool grade", () => {
    const wwt = harborQuoteWant({ size: "40", height: "DC", grade: "WWT" });
    const spoken = spokenHarborQuote({ ok: true }, "72201", "Little Rock, AR", wwt, 2800);
    assert.equal(
      spoken,
      "Thanks for being patient with me. That 40FT container, verified wind and water tight, comes with our 5-year structural and 5-year no-leak warranty, delivered, is going to be $2,800.",
    );
    assert.equal(spokenHarborGrade("CW"), "cargo worthy");
    assert.equal(spokenHarborGrade("WWT"), "verified wind and water tight");
    assert.equal(spokenHarborGrade("IICL"), "IICL / multi-trip");
    assert.equal(spokenHarborGrade("multi-trip"), "IICL / multi-trip");
    assert.equal(spokenHarborGrade("Multi-Trip"), "IICL / multi-trip");
    assert.equal(harborQuoteWant({ grade: "multi-trip" }).grade, "IICL");
    assert.equal(spokenHarborWarranty("multi-trip"), spokenHarborWarranty("IICL"));
    assert.equal(spokenHarborWarranty("WWT"), "5-year structural and 5-year no-leak warranty");
    assert.equal(spokenHarborWarranty("CW"), "5-year structural and 5-year no-leak warranty");
    assert.equal(spokenHarborWarranty("IICL"), "10-year structural and 10-year no-leak warranty");
    assert.equal(spokenHarborWarranty("AsIs"), "no warranty");
    assert.equal(spokenHarborWarranty("OneTrip"), "10-year structural and 10-year no-leak warranty plus manufacturer");
    const cw = spokenHarborQuote({ ok: true }, "72201", "Little Rock, AR", harborQuoteWant({ size: "40", height: "HC", grade: "CW" }), 2800);
    assert.equal(
      cw,
      "Thanks for being patient with me. That 40FT high cube container, cargo worthy, comes with our 5-year structural and 5-year no-leak warranty, delivered, is going to be $2,800.",
    );
    const oneTrip = spokenHarborQuote({ ok: true }, "72201", "Little Rock, AR", harborQuoteWant({ size: "40", height: "HC", grade: "OneTrip" }), 4200);
    assert.equal(
      oneTrip,
      "Thanks for being patient with me. That 40FT high cube container, one-trip, comes with our 10-year structural and 10-year no-leak warranty plus manufacturer, delivered, is going to be $4,200.",
    );
    const asIs = spokenHarborQuote({ ok: true }, "72201", "Little Rock, AR", harborQuoteWant({ size: "40", height: "DC", grade: "AsIs" }), 1800);
    assert.match(asIs, /as-is, with no warranty/);
    assert.doesNotMatch(asIs, /trash|5-year|10-year|wind and water/i);
    const iicl = spokenHarborQuote({ ok: true }, "72201", "Little Rock, AR", harborQuoteWant({ size: "40", height: "DC", grade: "IICL" }), 2600);
    assert.equal(
      iicl,
      "Thanks for being patient with me. That 40FT container, IICL / multi-trip, comes with our 10-year structural and 10-year no-leak warranty, delivered, is going to be $2,600.",
    );
    assert.doesNotMatch(oneTrip, /5-year|cargo worthy|wind and water|make it up|invent|proposal tool|cards are frozen/i);
    assert.match(HARBOR_QUOTE_WAIT_LINE, /container wiz, not a math expert/);
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
    assert.match(String(miss.body.spoken_summary), /don.?t have a posted number/i);
    assert.doesNotMatch(String(miss.body.spoken_summary), /make it up|invent|cards are frozen/i);
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
    assert.match(String(hit.body.spoken_summary), /Thanks for being patient with me/);
    assert.match(String(hit.body.spoken_summary), /cargo worthy/);
    assert.match(String(hit.body.spoken_summary), /5-year structural and 5-year no-leak warranty/);
    assert.match(String(hit.body.spoken_summary), /is going to be \$/);
    assert.doesNotMatch(String(hit.body.spoken_summary), /wind and water|10-year|make it up|invent|proposal tool|cards are frozen/i);
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
    assert.equal(got.body.dry_run, false);
    assert.equal(got.body.say_closer_name, false);
    assert.match(got.body.handoff_speech, /person who'll lock this in/);
    assert.doesNotMatch(got.body.handoff_speech, /Christopher|Bryan/);
    assert.doesNotMatch(JSON.stringify(got.body), /twilio|sms sent|texted/i);
    const notify = planHarborReadyToBuyNotify("Bryan Reese");
    assert.deepEqual(notify.to, [CHRISTOPHER_MAIL, BRYAN_MAIL]);
  });

  it("dry_run records the handoff and does not email, alert, or write the CRM", async () => {
    let mailed = 0;
    let notes = 0;
    let contacts = 0;
    const got = await handleHarborReadyToBuy(
      env(),
      req("/va/harbor/ready-to-buy", {
        token: TOKEN,
        body: {
          zip: "72201",
          size: "40",
          height: "HC",
          grade: "WWT",
          contact_name: "Pat Lee",
          phone: "8705550100",
          dry_run: true,
        },
      }),
      {
        lookupZip: async () => littleRock,
        loadOffers: async () => ({ offers: posted40 }),
        getContacts: async () => {
          contacts += 1;
          return [{ id: "c1", name: "Pat Lee", phone: "8705550100", owner: "Harbor", status: "Working", cteStage: "CTE1" }];
        },
        writeNote: async () => {
          notes += 1;
          return true;
        },
        sendMail: async () => {
          mailed += 1;
          return { ok: true, messageId: "m1", threadId: "t1" };
        },
      },
    );
    assert.equal(got.status, 200);
    assert.equal(got.body.ok, true);
    assert.equal(got.body.dry_run, true);
    assert.equal(got.body.noteWritten, false);
    assert.deepEqual(got.body.notified, []);
    assert.equal(got.body.mail.skipped, true);
    assert.equal(got.body.dialing, false);
    assert.equal(got.body.sms, false);
    assert.equal(mailed, 0);
    assert.equal(notes, 0);
    assert.equal(contacts, 0);
    assert.equal(got.body.contact, null);
    assert.match(got.body.handoff_speech, /lock this in/);
    assert.doesNotMatch(got.body.handoff_speech, /Christopher|Bryan/);
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
    assert.match(kbWorkflow, /get_next_lead/);
    assert.match(kbWorkflow, /Dry-run simulation checklist/);
    assert.match(kbWorkflow, /Twilio import last/);
    assert.match(kbWorkflow, /Do \*\*not\*\* import the Harbor DID/);
    assert.doesNotMatch(kbWorkflow, /From Twilio →|Account SID \+ Auth Token/);
    assert.match(kb01, /container wiz, not a math expert/);
    assert.match(kb01, /Thanks for being patient with me/);
    assert.match(kb01, /5-year structural and 5-year no-leak warranty/);
    assert.match(kb01, /10-year structural \+ 10-year no-leak \+ manufacturer/);
    assert.match(kb01, /Do not volunteer cards/);
    assert.match(kb01, /Do not mention Veem/);
    assert.match(kb01, /OS 2D ≠ OS 4D ≠ Full open/);
    assert.match(kb01, /air\/water leak testing to verify the container’s condition/);
    assert.match(kb07, /5-year structural \+ 5-year no-leak/);
    assert.match(kb07, /same warranty as WWT/);
    assert.match(kb07, /10-year structural \+ 10-year no-leak \+ manufacturer/);
    assert.match(kb07, /IICL \/ multi-trip[\s\S]*10-year structural \+ 10-year no-leak/);
    assert.match(kb07, /IICL is multi-trip — not two products/);
    assert.match(kb01, /IICL is multi-trip — not two products/);
    assert.match(kb16, /IICL is multi-trip — not two products/);
    assert.match(kb01, /USE-CASE RAPPORT/);
    assert.match(kb01, /Yeah, I love that use/);
    assert.match(kb01, /Do not rush past the story into questionnaire mode/);
    assert.match(kb01, /Do not invent inventory, ETAs, or discounts while hyping/);
    assert.match(kb16, /Yeah, I love that use/);
    assert.match(kb16, /not an endless hangout/);
    assert.match(kb07, /No warranty/);
    assert.match(kb07, /verified wind and water tight/);
    assert.match(kb07, /air\/water leak testing to verify the container’s condition/);
    assert.doesNotMatch(kb07, /1-year leak/);
    assert.match(kb16, /container wiz, not a math expert/);
    assert.match(kb16, /Thanks for being patient with me/);
    assert.match(kb16, /Do \*\*not\*\* volunteer cards/);
    assert.match(kb16, /10-year structural \+ 10-year no-leak \+ manufacturer/);
    assert.match(kb16, /OS 2D ≠ OS 4D ≠ Full open/);
    assert.match(kb16, /Do \*\*not\*\* mention Veem/);
    assert.match(kb16, /air\/water leak testing to verify the container’s condition/);
    assert.doesNotMatch(kb16, /1-year leak/);
    assert.doesNotMatch(kb01, /1-year leak/);
    for (const doc of [kb01, kb16]) {
      assert.match(doc, /I bet your phone's blowing up/);
      assert.match(doc, /When it's that cheap, get kind of leery/);
      assert.match(doc, /Not the cheapest — we take care of you and get it right/);
      assert.match(doc, /welder, not a fiberglass patch/i);
      assert.match(doc, /only company/);
      assert.match(doc, /two trucks/);
      assert.match(doc, /hydraulic tilt-bed/i);
      assert.match(doc, /130 ft/);
      assert.match(doc, /surface rust/i);
      assert.match(doc, /BBB/);
      assert.match(doc, /not the owner/i);
      assert.match(doc, /whenever the time's right/);
      assert.doesNotMatch(doc, /U-Haul|PODS|Mobile Mini|1-800-PACK-RAT/i);
    }
    assert.match(kb07, /Not the cheapest — we take care of you and get it right/);
    assert.match(kb07, /welder, not a fiberglass patch/i);
    assert.match(kb07, /two trucks/);
    assert.match(kb07, /hydraulic tilt-bed/i);
    assert.match(kb07, /130 ft/);
    assert.match(kb07, /surface rust/i);
    assert.match(kb07, /Do not say CBSS is the only company/);
    assert.match(kb01, /PAUSE AFTER THE PRICE/);
    assert.match(kb01, /One price at a time/);
    assert.match(kb01, /CONFIRM HIGH CUBE VS STANDARD BEFORE QUOTING/);
    assert.match(kb01, /Never assume/);
    assert.match(kb01, /shipping container quote you asked us for/);
    assert.match(kb01, /warm handoff, no name-drop/);
    assert.match(kb01, /call harbor_ready_to_buy in that same turn, every time/);
    assert.match(kb01, /dry_run true/);
    assert.match(kb01, /person who'll lock this in/);
    assert.match(kb15, /dry_run/);
    assert.match(kb15, /Never assume high cube/);
    assert.match(kb16, /shipping container quote you asked us for/);
    assert.match(kb16, /standard 8'6"/);
    assert.match(kb16, /high cube is 9'6"/i);
    assert.match(kb01, /Facebook form you filled out/);
    assert.match(kb01, /one email follow-up/);
    assert.match(kb01, /Do not convert it/);
    assert.match(kb01, /Never offer, request, or send SMS\/text/);
    assert.match(kb16, /Facebook form you filled out/);
    assert.match(kb16, /Do \*\*not\*\* convert a maybe/);
    assert.match(kb16, /No SMS/);
    assert.match(kb07, /Do not say CBSS is the only company/);
    assert.match(kb07, /residential \*\*and\*\* business/);
  });
});
