import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildReadyToBuyNote, flexBuyInterestLine, readHarborDeal, renderHarborBuildLeadNotice, renderHarborNeedsHumanNotice, renderHarborReadyToBuyNotice } from "../src/va/close-note.ts";
import { inboundCallerPhone, planInboundContact } from "../src/va/inbound.ts";
import {
  CHRISTOPHER_PERSONAL_CELL,
  CHRISTOPHER_PERSONAL_DIGITS,
  HARBOR_LOOKED_IN_OPENERS,
  HARBOR_QUOTE_REQUEST_OPENER,
  HARBOR_SIGNOFFS,
  BUILD_TEAM_LINE,
  FLEX_BUY_BUDGET_LINE,
  FLEX_BUY_DOWN_LINE,
  FLEX_BUY_HOUSE_LINE,
  FLEX_BUY_NUMBERS_LINE,
  FLEX_BUY_PLANS_LINE,
  NEEDS_HUMAN_VARIANTS,
  PAYMENT_CARD_ASK,
  PAYMENT_HOW_TO_PAY,
  PAYMENT_PATH_LINE,
  READY_TO_BUY_VARIANTS,
  harborCallbackNumber,
  hardNoSpoken,
  harborOutboundOpener,
  isChristopherPersonalCell,
  leadShowsQuoteRequest,
  pickReadyToBuyLine,
  softDelaySpoken,
  voicemailScript,
} from "../src/va/scripts.ts";
import {
  harborFollowupRow,
  harborOutcomeEdits,
  harborOutcomePlan,
  isExplicitHarborTestLead,
  isHarborNotifyTestRecord,
  resolveCloser,
  resolveHarborFollowUpAt,
} from "../src/va/workflow.ts";

const persona = readFileSync(new URL("../docs/outbound-sales-va/persona.md", import.meta.url), "utf8");
const scripts = readFileSync(new URL("../docs/outbound-sales-va/scripts.md", import.meta.url), "utf8");
const inbound = readFileSync(new URL("../docs/outbound-sales-va/inbound.md", import.meta.url), "utf8");

const card = { id: "real", name: "Pat Lee", company: "Lee Farms", owner: "Harbor", status: "Working", cteStage: "CTE2" };

describe("ready-to-buy spoken variants", () => {
  it("keeps four back-office next-step lines and no live transfer", () => {
    assert.equal(READY_TO_BUY_VARIANTS.length, 4);
    const texts = READY_TO_BUY_VARIANTS.map((row) => row.spoken);
    assert.equal(new Set(texts).size, texts.length);
    assert.match(texts.join("\n"), /back office who handle accounting/);
    assert.match(texts.join("\n"), /accounting in the back office/);
    assert.match(texts.join("\n"), /They take care of the accounting side/);
    assert.doesNotMatch(texts.join("\n"), /transfer|get you over|walk you over|push you off|bump you|put you through/i);
    assert.doesNotMatch(texts.join("\n"), /\b\d{1,2}:\d{2}\b|\b\d+\s*(minute|hour)s?\b|o'clock/i);
    assert.doesNotMatch(texts.join("\n"), /Christopher|Bryan|Brian/);
    assert.equal(pickReadyToBuyLine("accounting").id, "accounting");
    assert.equal(pickReadyToBuyLine("accounting").spoken, texts[0]);
    assert.equal(pickReadyToBuyLine(0).spoken, READY_TO_BUY_VARIANTS[0].spoken);
    assert.notEqual(pickReadyToBuyLine(0).spoken, pickReadyToBuyLine(1).spoken);
  });

  it("documents the variants in persona and scripts so the agent does not sound robotic", () => {
    assert.match(persona, /READY TO BUY/);
    assert.match(persona, /cash-drawer/);
    assert.match(persona, /checkbook/);
    assert.match(scripts, /Variant `accounting`/);
    assert.match(scripts, /Variant `cash-drawer`/);
    assert.match(scripts, /Variant `checkbook`/);
    assert.match(scripts, /do not read the identical sentence/i);
  });

  it("locks Harbor to call + email — no SMS, Voice-only Twilio", () => {
    const twilio = readFileSync(new URL("../docs/outbound-sales-va/twilio.md", import.meta.url), "utf8");
    assert.match(persona, /call \+ email only/i);
    assert.match(persona, /never texts/i);
    assert.match(scripts, /call \+ email only/i);
    assert.match(twilio, /Enable \*\*Voice\*\*/);
    assert.match(twilio, /SMS \/ Messaging off/);
    assert.match(twilio, /may differ from any preferred number unless you \*\*port\*\*/);
    assert.match(twilio, /Messaging capability/);
  });
});

describe("payment speech", () => {
  it("never puts frozen in a spoken line", () => {
    const spoken = [
      ...READY_TO_BUY_VARIANTS.map((row) => row.spoken),
      ...HARBOR_SIGNOFFS,
      ...HARBOR_LOOKED_IN_OPENERS,
      HARBOR_QUOTE_REQUEST_OPENER,
      PAYMENT_HOW_TO_PAY,
      PAYMENT_CARD_ASK,
      PAYMENT_PATH_LINE,
      ...NEEDS_HUMAN_VARIANTS.map((row) => row.spoken),
      BUILD_TEAM_LINE,
      FLEX_BUY_BUDGET_LINE,
      FLEX_BUY_DOWN_LINE,
      FLEX_BUY_HOUSE_LINE,
      FLEX_BUY_NUMBERS_LINE,
      FLEX_BUY_PLANS_LINE,
      hardNoSpoken(),
      softDelaySpoken("Friday"),
      voicemailScript({ name: "Sam", container: "40ft", harborDid: "(870) 380-4010" }),
    ];
    const prompt = readFileSync(new URL("../../docs/harbor-kb/01-system-prompt.md", import.meta.url), "utf8");
    const payments = readFileSync(new URL("../../docs/harbor-kb/06-payments.md", import.meta.url), "utf8");
    const fence = prompt.split("```")[1];
    const quoted = [];
    for (const source of [fence, payments, persona, scripts]) {
      for (const match of source.matchAll(/[“"]([^”"]+)[”"]/g)) quoted.push(match[1]);
    }
    for (const line of [...spoken, ...quoted]) {
      assert.doesNotMatch(line, /frozen/i);
    }
    assert.equal(
      PAYMENT_HOW_TO_PAY,
      "We take wire, ACH, e-check, money order, cashier's check or cash, and back office will send you the details.",
    );
    assert.equal(PAYMENT_CARD_ASK, "For containers we do bank transfer, check or cash; back office will walk you through it.");
    assert.equal(
      FLEX_BUY_BUDGET_LINE,
      "If the budget's tight, we've got Flex Buy. You can spread it over 6 up to 72 months, and standard units start at 10% down plus delivery.",
    );
    assert.equal(FLEX_BUY_PLANS_LINE, "Standard & modified containers: flexible 6, 12, 24, 48, or 72-month plans.");
    assert.equal(FLEX_BUY_HOUSE_LINE, "Custom container houses: extended mortgage-style terms up to 50 years.");
    assert.equal(FLEX_BUY_DOWN_LINE, "Standard units start at just 10% down plus delivery.");
    assert.equal(FLEX_BUY_NUMBERS_LINE, "Back office will run the numbers and send the options.");
    assert.doesNotMatch(FLEX_BUY_BUDGET_LINE + FLEX_BUY_PLANS_LINE + FLEX_BUY_HOUSE_LINE, /apr|monthly payment|frozen/i);
    assert.match(fence, /If they ask about a credit card, say/);
    assert.match(payments, /back office will send you the details/);
    assert.match(payments, /back office will walk you through it/);
    assert.doesNotMatch(payments, /unless the customer asks/i);
  });
});

describe("ready-to-buy closer note + handoff", () => {
  it("hands to Bryan, writes every deal field, and never collects payment", () => {
    const buy = harborOutcomePlan(card, "ready-to-buy", {
      closer: "Brian",
      spoken: "accounting",
      deal: {
        quoted: "40HC WWT delivered Jonesboro",
        size: "40HC",
        type: "standard",
        condition: "WWT",
        delivery: "Delivery — Jonesboro, AR",
        objections: "Timing next week is fine",
        promises: "Hold color until Friday",
        price: "3450",
      },
      note: "Loved the jobsite story.",
    });
    assert.equal(buy.status, "Ready to buy");
    assert.equal(buy.owner, "Bryan Reese");
    assert.equal(buy.handoff, true);
    assert.equal(buy.hardNo, false);
    assert.equal(buy.followUp, false);
    assert.match(buy.spoken, /back office who handle accounting/);
    assert.match(buy.note, /40ft high cube, wind and water tight/);
    assert.match(buy.note, /Delivery — Jonesboro, AR/);
    assert.match(buy.note, /\$3,450/);
    assert.match(buy.note, /Notes: Timing next week is fine\. Hold color until Friday/);
    assert.match(buy.note, /Harbor told them: back office will send next steps\./);
    assert.match(buy.note, /cashier's check or cash only/);
    assert.match(buy.note, /Your move: send invoice/);
    assert.doesNotMatch(buy.note, /CTE|Closer of record|Cards frozen|do not invent|no posted match|not stated|Loved the jobsite/);
    assert.equal(resolveCloser("Bryan Reese"), "Bryan Reese");
    const missing = buildReadyToBuyNote({ contact: { name: "Sam Ortiz" } });
    assert.match(missing, /Ready to buy: Sam Ortiz/);
    assert.match(missing, /Your move: call back/);
    assert.doesNotMatch(missing, /not stated|Notes:/);
    assert.equal(readHarborDeal({ size: "20DC", deal: { price: "1200" } }).price, "1200");
  });

  it("renders one short note for a filled lead and a sparse lead", () => {
    const filled = renderHarborReadyToBuyNotice({
      name: "Jordan Hale",
      phone: "8705550142",
      city: "Jonesboro",
      zip: "72401",
      size: "40",
      type: "HC",
      condition: "CW",
      use: "backyard storage",
      delivery: "delivery",
      timing: "next week",
      price: 3400,
      objections: "driveway is tight",
      promises: "Hold the box until Friday.",
    });
    assert.equal(filled.subject, "Ready to buy: Jordan Hale - 40ft high cube, cargo worthy");
    assert.equal(
      filled.text,
      [
        "Ready to buy: Jordan Hale, (870) 555-0142, Jonesboro 72401",
        "40ft high cube, cargo worthy, backyard storage, delivery next week, $3,400",
        "Harbor told them: back office will send next steps.",
        "Payment: wire, ACH, e-check, money order, cashier's check or cash only.",
        "Your move: send invoice",
        "Notes: driveway is tight. Hold the box until Friday.",
      ].join("\n"),
    );
    const sparse = renderHarborReadyToBuyNotice({ name: "Sam Ortiz", price: "no posted match — do not invent", size: "not stated" });
    assert.equal(sparse.subject, "Ready to buy: Sam Ortiz");
    assert.equal(
      sparse.text,
      [
        "Ready to buy: Sam Ortiz",
        "Harbor told them: back office will send next steps.",
        "Payment: wire, ACH, e-check, money order, cashier's check or cash only.",
        "Your move: call back",
      ].join("\n"),
    );
    const gate = renderHarborReadyToBuyNotice({ name: "Gate Check No Customer", test: true });
    assert.equal(gate.subject, "[TEST - not a customer] Ready to buy: Gate Check No Customer");
    assert.match(gate.text, /^\[TEST - not a customer\]\nReady to buy: Gate Check No Customer/);
    assert.equal(isHarborNotifyTestRecord({ name: "Gate Check No Customer", testLead: false }), true);
    assert.equal(isExplicitHarborTestLead({ name: "Gate Check No Customer", testLead: false }), false);
    assert.equal(isHarborNotifyTestRecord({ name: "Pat Lee", cteStage: "CTE1" }), false);
    const human = renderHarborNeedsHumanNotice({ name: "Sam Ortiz" });
    assert.equal(human.subject, "Needs a human: Sam Ortiz");
    assert.equal(
      human.text,
      [
        "Needs a human: Sam Ortiz",
        "Harbor told them: someone from the team will call back.",
        "Your move: call back",
      ].join("\n"),
    );
    assert.doesNotMatch(human.text, /not stated|frozen|Payment:/i);
    const flex = renderHarborReadyToBuyNotice({
      name: "Jordan Hale",
      phone: "8705550142",
      city: "Jonesboro",
      zip: "72401",
      size: "40",
      type: "standard",
      condition: "CW",
      price: 2800,
      flexBuy: "yes",
      flexBuyTerm: "24 months",
    });
    assert.match(flex.text, /Flex Buy interest: yes, 24 months/);
    assert.doesNotMatch(flex.text, /frozen|APR|monthly/i);
    const flexBare = renderHarborReadyToBuyNotice({ name: "Sam Ortiz", flexBuy: "yes" });
    assert.match(flexBare.text, /Flex Buy interest: yes\n/);
    assert.doesNotMatch(flexBare.text, /Flex Buy interest: yes,/);
    const flexBuild = renderHarborBuildLeadNotice({
      name: "Jordan Hale",
      project: "container house",
      flexBuy: true,
      flexBuyTerm: "up to 50 years",
    });
    assert.match(flexBuild.text, /Flex Buy interest: yes, up to 50 years/);
    assert.equal(flexBuyInterestLine("yes", "12% APR"), "Flex Buy interest: yes");
    assert.equal(flexBuyInterestLine("", ""), "");
    const noFlex = renderHarborReadyToBuyNotice({ name: "Sam Ortiz" });
    assert.doesNotMatch(noFlex.text, /Flex Buy/);
    const tagged = renderHarborNeedsHumanNotice({ name: "TEST- Unsure", test: true, asked: "a warranty from 2019" });
    assert.equal(tagged.subject, "[TEST - not a customer] Needs a human: TEST- Unsure");
    assert.match(tagged.text, /^\[TEST - not a customer\]\nNeeds a human: TEST- Unsure\na warranty from 2019/);
  });
});

describe("soft delay vs hard no", () => {
  it("soft delay stays Harbor Follow-up and writes a next-business-day task", () => {
    const delay = harborOutcomePlan(card, "talk to wife", {
      reason: "talk to wife",
      followUpDate: "2026-09-26",
      now: new Date("2026-09-22T17:00:00Z"),
    });
    assert.equal(delay.outcome, "soft-delay");
    assert.equal(delay.owner, "Harbor");
    assert.equal(delay.status, "Follow-up");
    assert.equal(delay.softDelay, true);
    assert.equal(delay.hardNo, false);
    assert.equal(delay.followUp, true);
    assert.equal(delay.followUpDate, "2026-09-28T10:00");
    assert.match(delay.note, /talk to wife/);
    assert.match(delay.note, /Do not close-out or DNC/);
    assert.equal(harborOutcomeEdits(delay).nextAction.includes("talk to wife"), true);
    assert.equal(harborFollowupRow(delay)?.status, "open");
    const nextDay = resolveHarborFollowUpAt("", new Date("2026-09-22T17:00:00Z"));
    assert.equal(nextDay, "2026-09-23T10:00");
  });

  it("hard nos close the card with no follow-up", () => {
    const bought = harborOutcomePlan(card, "bought elsewhere");
    assert.equal(bought.status, "Bought elsewhere");
    assert.equal(bought.hardNo, true);
    assert.equal(bought.followUp, false);
    assert.equal(harborFollowupRow(bought)?.completed, true);
    assert.equal(harborOutcomePlan(card, "not-interested").status, "Not interested");
    assert.equal(harborOutcomePlan(card, "DNC").status, "DNC");
    assert.equal(harborOutcomePlan(card, "wrong-number").status, "Email campaign");
  });
});

describe("outbound opener follows the lead record", () => {
  it("references a quote only when the card shows a quote request", () => {
    const quote = harborOutboundOpener({ name: "Pat", status: "Quoted", notes: "40HC" }, 0);
    assert.equal(quote.kind, "quote_request");
    assert.equal(quote.spoken, HARBOR_QUOTE_REQUEST_OPENER);
    assert.match(quote.spoken, /quote you asked us for/);
    const asked = harborOutboundOpener({ name: "Pat", notes: "They asked for a quote on a 20ft." }, 0);
    assert.equal(asked.kind, "quote_request");
    assert.equal(leadShowsQuoteRequest({ form: "Get a Quote", status: "New" }), true);
    assert.equal(leadShowsQuoteRequest({ quote_requested: "yes", status: "New" }), true);
    const looked = harborOutboundOpener({ name: "Pat", status: "New", source: "facebook_lead_ads", campaign: "storage containers" }, 0);
    assert.equal(looked.kind, "looked_in");
    assert.equal(looked.spoken, HARBOR_LOOKED_IN_OPENERS[0]);
    assert.doesNotMatch(looked.spoken, /asked|quote request|you asked/i);
    assert.match(looked.spoken, /looking into containers for storage|looking at storage containers/);
    const later = harborOutboundOpener({ name: "Pat", status: "New" }, 60000);
    assert.equal(later.spoken, HARBOR_LOOKED_IN_OPENERS[1]);
    assert.notEqual(looked.spoken, later.spoken);
  });

  it("signs off like a person and does not thank them for the time on a hard no", () => {
    assert.equal(HARBOR_SIGNOFFS.length, 3);
    assert.match(HARBOR_SIGNOFFS[0], /Appreciate you\. Talk soon\./);
    for (const line of HARBOR_SIGNOFFS) {
      assert.doesNotMatch(line, /great day|thanks for choosing|thanks for the time/i);
    }
    assert.equal(hardNoSpoken(), "Understood. I won't keep calling.");
    assert.doesNotMatch(hardNoSpoken(), /thanks for the time/i);
  });

  it("does not treat a model flag on a real card as a test lead", () => {
    assert.equal(isExplicitHarborTestLead({ name: "Pat Lee", phone: "8705550100", status: "Working" }), false);
    assert.equal(isExplicitHarborTestLead({ name: "Pat Lee", tags: ["test-lead"] }), true);
    assert.equal(isExplicitHarborTestLead({ name: "Pat Lee", testLead: true }), true);
    assert.equal(isExplicitHarborTestLead({ name: "TEST- Dummy", source: "facebook_lead_ads" }), true);
    assert.equal(isExplicitHarborTestLead(null), false);
  });
});

describe("inbound Harbor answer", () => {
  it("matches CLI or parks a new Harbor card; ready-to-buy still hands off", () => {
    const book = [{ id: "c1", name: "Pat Lee", phone: "(870) 555-0199", owner: "Harbor", cteStage: "CTE1" }];
    const hit = planInboundContact(book, { phone: "8705550199" });
    assert.equal(hit.created, false);
    assert.equal(hit.contact && hit.contact.id, "c1");
    const fresh = planInboundContact([], { phone: "8705550111", name: "Kim" });
    assert.equal(fresh.created, true);
    assert.equal(fresh.contact && fresh.contact.owner, "Harbor");
    assert.equal(fresh.contact && fresh.contact.source, "inbound_twilio");
    assert.equal(inboundCallerPhone({ From: "+18705550199" }), "+18705550199");
    const buy = harborOutcomePlan(card, "ready-to-buy", { inbound: true, closer: "Christopher Banks", spoken: "boxes" });
    assert.equal(buy.outcome, "inbound-ready-to-buy");
    assert.equal(buy.owner, "Christopher Banks");
    assert.equal(buy.status, "Ready to buy");
    assert.match(buy.note, /Ready to buy: Pat Lee/);
    assert.match(buy.note, /Your move: call back/);
    assert.doesNotMatch(buy.note, /Harbor inbound|CTE|Closer of record/);
    const soft = harborOutcomePlan(card, "inbound-answered");
    assert.equal(soft.owner, "Harbor");
    assert.equal(soft.status, "Working");
    assert.match(soft.note, /Not solid yet/);
    assert.match(inbound, /Harbor \*\*answers\*\*/);
    assert.match(inbound, /870\) 323-2593/);
    assert.match(inbound, /Voice only|enable \*\*Voice\*\*/);
  });
});

describe("voicemail leaves Harbor DID, never Christopher personal cell", () => {
  it("personalizes name + container and refuses 870-323-2593 as the callback", () => {
    const vm = harborOutcomePlan(card, "voicemail", {
      harborDid: "+18706823867",
      container: "40HC",
    });
    assert.equal(vm.cteStage, "CTE3");
    assert.equal(vm.owner, "Harbor");
    assert.match(vm.note, /Voicemail left/);
    assert.match(vm.spoken, /Hey Pat/);
    assert.match(vm.spoken, /40HC/);
    assert.match(vm.spoken, /\+18706823867/);
    assert.equal(vm.spoken.includes(CHRISTOPHER_PERSONAL_CELL), false);
    assert.equal(vm.spoken.includes(CHRISTOPHER_PERSONAL_DIGITS), false);
    assert.equal(isChristopherPersonalCell("(870) 323-2593"), true);
    assert.equal(harborCallbackNumber("(870) 323-2593"), "the Harbor callback number on this line");
    const blocked = voicemailScript({ name: "Pat", container: "20DC", harborDid: "870-323-2593" });
    assert.doesNotMatch(blocked, /870-323-2593/);
    assert.doesNotMatch(blocked, /8703232593/);
  });
});
