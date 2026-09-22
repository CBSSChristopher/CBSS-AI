import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildReadyToBuyNote, readHarborDeal } from "../src/va/close-note.ts";
import { inboundCallerPhone, planInboundContact } from "../src/va/inbound.ts";
import {
  CHRISTOPHER_PERSONAL_CELL,
  CHRISTOPHER_PERSONAL_DIGITS,
  READY_TO_BUY_VARIANTS,
  harborCallbackNumber,
  isChristopherPersonalCell,
  pickReadyToBuyLine,
  voicemailScript,
} from "../src/va/scripts.ts";
import {
  harborFollowupRow,
  harborOutcomeEdits,
  harborOutcomePlan,
  resolveCloser,
  resolveHarborFollowUpAt,
} from "../src/va/workflow.ts";

const persona = readFileSync(new URL("../docs/outbound-sales-va/persona.md", import.meta.url), "utf8");
const scripts = readFileSync(new URL("../docs/outbound-sales-va/scripts.md", import.meta.url), "utf8");
const inbound = readFileSync(new URL("../docs/outbound-sales-va/inbound.md", import.meta.url), "utf8");

const card = { id: "real", name: "Pat Lee", company: "Lee Farms", owner: "Harbor", status: "Working", cteStage: "CTE2" };

describe("ready-to-buy spoken variants", () => {
  it("keeps the canonical cheesy accounting line plus three alternates", () => {
    assert.equal(READY_TO_BUY_VARIANTS.length >= 4, true);
    const texts = READY_TO_BUY_VARIANTS.map((row) => row.spoken);
    assert.equal(new Set(texts).size, texts.length);
    assert.match(texts.join("\n"), /I can't take your payment/);
    assert.match(texts.join("\n"), /I'm just in sales/);
    assert.match(texts.join("\n"), /cash drawer/);
    assert.match(texts.join("\n"), /excited about boxes/);
    assert.equal(pickReadyToBuyLine("accounting").id, "accounting");
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
    assert.match(buy.spoken, /I can't take your payment/);
    assert.match(buy.note, /Quoted: 40HC WWT delivered Jonesboro/);
    assert.match(buy.note, /Size \/ type \/ condition: 40HC \/ standard \/ WWT/);
    assert.match(buy.note, /Delivery \/ pickup: Delivery — Jonesboro, AR/);
    assert.match(buy.note, /Objections cleared: Timing next week is fine/);
    assert.match(buy.note, /Soft promises: Hold color until Friday/);
    assert.match(buy.note, /Exact price: 3450/);
    assert.match(buy.note, /does not collect payment/);
    assert.match(buy.note, /wire \/ ACH/);
    assert.match(buy.note, /Loved the jobsite story/);
    assert.equal(resolveCloser("Bryan Reese"), "Bryan Reese");
    const missing = buildReadyToBuyNote({ cte: "CTE1", closer: "Christopher Banks" });
    assert.match(missing, /Quoted: not stated/);
    assert.match(missing, /Cards frozen — wire \/ ACH/);
    assert.equal(readHarborDeal({ size: "20DC", deal: { price: "1200" } }).price, "1200");
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
    assert.match(buy.note, /Harbor inbound/);
    const soft = harborOutcomePlan(card, "inbound-answered");
    assert.equal(soft.owner, "Harbor");
    assert.equal(soft.status, "Working");
    assert.match(soft.note, /Not solid yet/);
    assert.match(inbound, /Harbor \*\*answers\*\*/);
    assert.match(inbound, /870\) 323-2593/);
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
