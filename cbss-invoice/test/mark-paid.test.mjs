import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  LIST_KEY,
  NEXT_STEPS_RETRY_ERROR,
  NEXT_STEPS_SUBJECT,
  NEXT_STEPS_UNCONFIGURED_ERROR,
  firstNameFromCard,
  markPaidAndNotify,
  paidNextStepsBody,
} from "../src/mark-paid.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const src = readFileSync(new URL("../src/mark-paid.ts", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

function memoryKv(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const value = data.get(key);
      if (value == null) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      data.set(key, String(value));
    },
  };
}

function sampleCard(overrides = {}) {
  return {
    id: "CBS-2026-120",
    status: "ach",
    amount: 3990,
    currency: "USD",
    email: "gary@test.com",
    name: "Gary Smith",
    notes: "40HC CW delivered",
    payLink: "",
    gmailLink: "",
    referenceId: "CBS-2026-120",
    timeCreated: "2026-09-01T12:00:00.000Z",
    emailedByWaave: false,
    sentBy: "james@cbshippingsolutions.com",
    ccEmails: [],
    documentNumber: "CBS-2026-120",
    payMethod: "ach",
    ...overrides,
  };
}

function envWithCards(cards, extra = {}) {
  return {
    INVOICE_STORE: memoryKv({ [LIST_KEY]: JSON.stringify(cards) }),
    ...extra,
  };
}

describe("Mark paid → AgentMail Next Steps", () => {
  it("exposes the signed-in route and does not call Master Chief / Resend / Gmail send", () => {
    assert.match(index, /\/invoice\/mark-paid/);
    assert.match(page, /Mark paid/);
    assert.match(src, /api\.agentmail\.to\/v0/);
    assert.match(src, /AGENTMAIL_API_KEY/);
    assert.match(readme, /AGENTMAIL_API_KEY/);
    assert.doesNotMatch(src, /NEXT_STEPS_WEBHOOK_URL/);
    assert.doesNotMatch(index, /resend/i);
    assert.doesNotMatch(src, /Master Chief/);
  });

  it("uses the approved paid body and never invents a first name from money fields", () => {
    assert.equal(firstNameFromCard(sampleCard()), "Gary");
    const body = paidNextStepsBody("Gary");
    assert.match(body, /Hi Gary,/);
    assert.match(body, /we've received your payment/);
    assert.match(body, /https:\/\/cbshippingsolutions\.app\//);
    assert.equal(NEXT_STEPS_SUBJECT, "Next steps for your CB Shipping Solutions order");
    assert.doesNotMatch(body, /3990|\bACH\b|routing|collection/i);
  });

  it("records paid and sends AgentMail once", async () => {
    const calls = [];
    const env = envWithCards([sampleCard()], { AGENTMAIL_API_KEY: "am_test" });
    const first = await markPaidAndNotify(env, "CBS-2026-120", "James@cbshippingsolutions.com", async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ message_id: "msg_1", thread_id: "thd_1" }), { status: 200 });
    });
    assert.equal(first.ok, true);
    assert.equal(first.paid, true);
    assert.ok(first.card.nextStepsEmailSentAt);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/inboxes\/cbss%40agentmail\.to\/messages\/send/);
    assert.match(calls[0].init.headers.Authorization, /Bearer am_test/);
    const payload = JSON.parse(calls[0].init.body);
    assert.deepEqual(payload.to, ["gary@test.com"]);
    assert.ok(payload.cc.some((addr) => addr.startsWith("christopher@")));
    assert.ok(payload.cc.includes("aliyah@cbshippingsolutions.com"));
    assert.ok(payload.cc.includes("james@cbshippingsolutions.com"));
    assert.equal(payload.subject, NEXT_STEPS_SUBJECT);
    assert.doesNotMatch(JSON.stringify(payload), /3990|ACH|routing/);

    const second = await markPaidAndNotify(env, "CBS-2026-120", "aliyah@cbshippingsolutions.com", async () => {
      calls.push({ url: "nope" });
      return new Response(JSON.stringify({ message_id: "msg_2" }), { status: 200 });
    });
    assert.equal(second.ok, true);
    assert.equal(second.alreadyPaid, true);
    assert.equal(second.webhookFired, false);
    assert.equal(calls.length, 1);
  });

  it("keeps paid and returns a config error when AgentMail is missing", async () => {
    const result = await markPaidAndNotify(envWithCards([sampleCard()]), "CBS-2026-120", "james@cbshippingsolutions.com", async () => {
      throw new Error("should not send");
    });
    assert.equal(result.ok, false);
    assert.equal(result.paid, true);
    assert.equal(result.error, NEXT_STEPS_UNCONFIGURED_ERROR);
  });

  it("keeps paid and asks for retry when AgentMail fails", async () => {
    const env = envWithCards([sampleCard()], { AGENTMAIL_API_KEY: "am_test" });
    const result = await markPaidAndNotify(env, "CBS-2026-120", "james@cbshippingsolutions.com", async () => {
      return new Response("nope", { status: 500 });
    });
    assert.equal(result.ok, false);
    assert.equal(result.paid, true);
    assert.equal(result.error, NEXT_STEPS_RETRY_ERROR);
    const stored = await env.INVOICE_STORE.get(LIST_KEY, "json");
    assert.equal(stored[0].status, "paid");
    assert.equal(stored[0].nextStepsEmailSentAt, undefined);
  });
});
