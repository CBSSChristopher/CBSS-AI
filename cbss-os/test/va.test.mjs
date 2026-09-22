import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { pageHtml } from "../src/page.ts";
import { buildVaEmailDraft } from "../src/va/draft.ts";
import { applyFlushResult, planVaFlush } from "../src/va/flush.ts";
import { hmacSha256Hex, verifyVaWebhook } from "../src/va/hmac.ts";
import { isDoNotTouch, matchCrmContact, phoneDigits } from "../src/va/match.ts";
import { vaActivityNote } from "../src/va/note.ts";
import { parseVaWebhookPayload } from "../src/va/parse.ts";
import { normalizeVaOutcome, VA_OUTCOMES } from "../src/va/outcomes.ts";
import { dialGate, publicVaStatus } from "../src/va/status.ts";
import { emptyCapture } from "../src/va/store.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/auth.ts", import.meta.url), "utf8");

describe("outbound VA outcomes", () => {
  it("locks the seven slugs and maps aliases", () => {
    assert.deepEqual([...VA_OUTCOMES], [
      "no-answer",
      "gatekeeper",
      "not-interested",
      "callback",
      "booked",
      "DNC",
      "wrong-number",
    ]);
    assert.equal(normalizeVaOutcome("voicemail"), "no-answer");
    assert.equal(normalizeVaOutcome("do not call"), "DNC");
    assert.equal(normalizeVaOutcome("site visit"), "booked");
    assert.equal(normalizeVaOutcome("maybe later"), "");
  });
});

describe("outbound VA webhook parse", () => {
  it("reads the canonical payload", () => {
    const got = parseVaWebhookPayload({
      callId: "CA1",
      phone: "870-555-0100",
      contactName: "Pat Lee",
      outcome: "booked",
      summary: "Jobsite 40HC",
      closer: "James",
    });
    assert.equal(got.ok, true);
    if (!got.ok) return;
    assert.equal(got.capture.outcome, "booked");
    assert.equal(got.capture.phone, "870-555-0100");
    assert.equal(got.capture.closer, "James");
  });

  it("reads an ElevenLabs-shaped post-call body", () => {
    const got = parseVaWebhookPayload({
      conversation_id: "conv_9",
      data: {
        conversation_id: "conv_9",
        transcript: [{ role: "agent", message: "Outbound desk at CB Shipping Solutions" }],
        analysis: { outcome: "callback", transcript_summary: "Ask Thursday" },
        metadata: { phone_call: { external_number: "+18705550100" } },
      },
    });
    assert.equal(got.ok, true);
    if (!got.ok) return;
    assert.equal(got.capture.source, "elevenlabs");
    assert.equal(got.capture.outcome, "callback");
    assert.equal(got.capture.phone, "+18705550100");
    assert.match(got.capture.transcript, /Outbound desk/);
  });

  it("rejects a payload with no taxonomy outcome", () => {
    const got = parseVaWebhookPayload({ phone: "8705550100", summary: "hello" });
    assert.equal(got.ok, false);
  });
});

describe("outbound VA HMAC", () => {
  it("accepts sha256 hex of the raw body", async () => {
    const secret = "test-va-secret";
    const raw = '{"outcome":"no-answer","phone":"8705550100","callId":"x"}';
    const hex = await hmacSha256Hex(secret, raw);
    const headers = new Headers({ "X-VA-Signature": "sha256=" + hex });
    assert.equal(await verifyVaWebhook(secret, headers, raw), true);
    assert.equal(await verifyVaWebhook(secret, headers, raw + "x"), false);
    assert.equal(await verifyVaWebhook("", headers, raw), false);
  });
});

describe("outbound VA CRM match and DNC", () => {
  const book = [
    { id: "c1", name: "Pat Lee", phone: "(870) 555-0100", status: "Working" },
    { id: "c2", name: "DNC Co", phone: "8705550199", dnc: true, status: "Working" },
    { id: "c3", name: "Stage DNC", phone: "8705550188", status: "DNC" },
  ];

  it("matches by contact id then by last-10 phone digits", () => {
    assert.equal(phoneDigits("(870) 555-0100"), "8705550100");
    assert.equal(matchCrmContact(book, { contactId: "c1" })?.name, "Pat Lee");
    assert.equal(matchCrmContact(book, { phone: "+1 870 555 0100" })?.id, "c1");
    assert.equal(matchCrmContact(book, { phone: "5550000" }), null);
  });

  it("treats dnc field and DNC stage as do-not-touch", () => {
    assert.equal(isDoNotTouch(book[0]), false);
    assert.equal(isDoNotTouch(book[1]), true);
    assert.equal(isDoNotTouch(book[2]), true);
  });

  it("writes a Book note for a matched live lead", () => {
    const capture = emptyCapture({
      outcome: "booked",
      contactName: "Pat Lee",
      phone: "8705550100",
      summary: "Jobsite 40HC",
      bookedAt: "Thursday 2pm",
    });
    const plan = planVaFlush(capture, book);
    assert.equal(plan.action, "write");
    if (plan.action !== "write") return;
    assert.equal(plan.contactId, "c1");
    assert.match(plan.note, /VA outbound · Booked · Pat Lee/);
    assert.doesNotMatch(plan.note, /card checkout|Visa|pay link/i);
  });

  it("skips do-not-touch unless the outcome is DNC", () => {
    const sales = emptyCapture({ outcome: "callback", phone: "8705550199" });
    assert.equal(planVaFlush(sales, book).action, "skip");
    if (planVaFlush(sales, book).action === "skip") {
      assert.equal(planVaFlush(sales, book).reason, "dnc");
    }
    const stop = emptyCapture({ outcome: "DNC", phone: "8705550199", contactId: "c2" });
    const plan = planVaFlush(stop, book);
    assert.equal(plan.action, "write");
  });

  it("skips unmatched numbers", () => {
    const plan = planVaFlush(emptyCapture({ outcome: "no-answer", phone: "8705550000" }), book);
    assert.deepEqual(plan, { action: "skip", reason: "unmatched" });
  });

  it("marks a successful write flushed", () => {
    const capture = emptyCapture({ outcome: "booked", phone: "8705550100" });
    const plan = planVaFlush(capture, book);
    const next = applyFlushResult(capture, plan, true);
    assert.equal(next.crmFlushed, true);
    assert.equal(next.contactId, "c1");
  });
});

describe("outbound VA parked rails", () => {
  it("never reports dialing and stays parked without flags", () => {
    const parked = dialGate({ VA_ENABLED: "false", VA_DIAL_ARMED: "false" });
    assert.equal(parked.status, 403);
    assert.equal(parked.body.dialing, false);
    const armed = dialGate({
      VA_ENABLED: "true",
      VA_DIAL_ARMED: "true",
      VA_WEBHOOK_SECRET: "x",
      ELEVENLABS_API_KEY: "x",
      TWILIO_ACCOUNT_SID: "x",
      TWILIO_AUTH_TOKEN: "x",
      TWILIO_PHONE_NUMBER: "+18705550111",
    });
    assert.equal(armed.status, 501);
    assert.equal(armed.body.dialing, false);
    const pub = publicVaStatus({ VA_ENABLED: "false" });
    assert.equal(pub.dialing, false);
    assert.equal(pub.enabled, false);
    assert.match(String(pub.harborNote), /not the Harbor staff-comms/);
  });

  it("email drafts never mark sent and never promise cards", () => {
    const draft = buildVaEmailDraft({ kind: "intro", name: "Pat", to: "pat@example.com" });
    assert.equal(draft.sent, false);
    assert.match(draft.text, /not sent/i);
    assert.match(draft.text, /do not send a card checkout link/i);
    assert.doesNotMatch(draft.text, /we take visa|card machine is back|send a pay link/i);
    assert.match(buildVaEmailDraft({ kind: "booked-confirm" }).text, /wire \/ ACH/);
  });
});

describe("outbound VA Yard wiring", () => {
  it("keeps wrangler flags off and does not commit secret values", () => {
    assert.match(wrangler, /"VA_ENABLED": "false"/);
    assert.match(wrangler, /"VA_DIAL_ARMED": "false"/);
    assert.doesNotMatch(wrangler, /ELEVENLABS_API_KEY|TWILIO_AUTH_TOKEN|VA_WEBHOOK_SECRET\s*:/);
    assert.match(auth, /VA_WEBHOOK_SECRET\?: string/);
    assert.match(auth, /loginCrmTool/);
  });

  it("exposes webhook, flush, draft, and parked dial routes", () => {
    assert.match(index, /\/va\/hooks\/outbound/);
    assert.match(index, /\/va\/leads\/import/);
    assert.match(index, /\/va\/harbor\/next/);
    assert.match(index, /\/va\/captures\/flush/);
    assert.match(index, /\/va\/email\/draft/);
    assert.match(index, /\/va\/dial/);
    assert.doesNotMatch(index, /\/va\/hooks\/facebook-leads/);
    assert.match(index, /handleVaOutboundHook/);
    assert.match(index, /appendCycleCrmNote/);
  });

  it("puts a Christopher-only VA calls tab on the desk", () => {
    assert.match(page, /id="crm-va-tab"/);
    assert.match(page, /data-crm="va"/);
    assert.match(page, /Write pending to CRM/);
    assert.match(page, /loadVaCalls/);
    assert.match(page, /VA calls are for Christopher only/);
  });
});
