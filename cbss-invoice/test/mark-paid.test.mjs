import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  LIST_KEY,
  NEXT_STEPS_RETRY_ERROR,
  NEXT_STEPS_SIGNATURE_HEADER,
  NEXT_STEPS_UNCONFIGURED_ERROR,
  buildNextStepsPayload,
  cardMatchesId,
  hmacSha256Hex,
  markPaidAndNotify,
} from "../src/mark-paid.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
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

describe("Mark paid → Next Steps webhook", () => {
  it("exposes the signed-in route and Mark paid button", () => {
    assert.match(index, /\/invoice\/mark-paid/);
    assert.match(index, /markPaidAndNotify/);
    assert.match(index, /\/assets\/next-steps\.pdf/);
    assert.match(page, /Mark paid/);
    assert.match(page, /Paid \/ Next Steps queued/);
    assert.match(page, /Paid but Next Steps notify failed — retry/);
    assert.match(page, /data-mark-paid/);
    assert.match(readme, /NEXT_STEPS_WEBHOOK_URL/);
    assert.match(readme, /NEXT_STEPS_WEBHOOK_SECRET/);
    assert.match(readme, /Yard paid → Next Steps email/);
    assert.match(readme, /X-Webhook-Signature/);
    assert.doesNotMatch(index, /resend/i);
    assert.doesNotMatch(page, /Resend/);
  });

  it("matches a card by CBS number or WAAVE id", () => {
    const card = sampleCard({ id: "waave-9", documentNumber: "CBS-2026-120" });
    assert.equal(cardMatchesId(card, "CBS-2026-120"), true);
    assert.equal(cardMatchesId(card, "waave-9"), true);
    assert.equal(cardMatchesId(card, "missing"), false);
  });

  it("builds a notify payload with names and no money fields", () => {
    const payload = buildNextStepsPayload(
      sampleCard({ status: "paid", paidAt: "2026-09-09T15:00:00.000Z", paidBy: "james@cbshippingsolutions.com" }),
      false,
    );
    assert.deepEqual(payload, {
      invoiceId: "CBS-2026-120",
      number: "CBS-2026-120",
      clientEmail: "gary@test.com",
      clientName: "Gary Smith",
      firstName: "Gary",
      repEmail: "james@cbshippingsolutions.com",
      paidAt: "2026-09-09T15:00:00.000Z",
      nextStepsAlreadySent: false,
    });
    const raw = JSON.stringify(payload);
    assert.doesNotMatch(raw, /3990|amount|ACH|wire|payLink/i);
  });

  it("records paid and fires the webhook once", async () => {
    const calls = [];
    const env = envWithCards([sampleCard()], { NEXT_STEPS_WEBHOOK_URL: "https://hooks.example.test/next-steps" });
    const first = await markPaidAndNotify(env, "CBS-2026-120", "James@cbshippingsolutions.com", async (url, init) => {
      calls.push({ url, init });
      return new Response("ok", { status: 200 });
    });
    assert.equal(first.ok, true);
    assert.equal(first.paid, true);
    assert.equal(first.nextStepsQueued, true);
    assert.equal(first.webhookFired, true);
    assert.equal(first.card.status, "paid");
    assert.equal(first.card.paidBy, "james@cbshippingsolutions.com");
    assert.ok(first.card.paidAt);
    assert.ok(first.card.nextStepsWebhookSentAt);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://hooks.example.test/next-steps");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.clientEmail, "gary@test.com");
    assert.equal(body.firstName, "Gary");
    assert.equal(body.nextStepsAlreadySent, false);
    assert.equal(body.amount, undefined);

    const second = await markPaidAndNotify(env, "CBS-2026-120", "aliyah@cbshippingsolutions.com", async () => {
      calls.push({ url: "should-not-fire" });
      return new Response("ok", { status: 200 });
    });
    assert.equal(second.ok, true);
    assert.equal(second.alreadyPaid, true);
    assert.equal(second.webhookFired, false);
    assert.equal(second.card.paidBy, "james@cbshippingsolutions.com");
    assert.equal(calls.length, 1);
  });

  it("keeps paid and returns a config error when the webhook URL is missing", async () => {
    let fired = 0;
    const env = envWithCards([sampleCard()]);
    const result = await markPaidAndNotify(env, "CBS-2026-120", "james@cbshippingsolutions.com", async () => {
      fired += 1;
      return new Response("ok", { status: 200 });
    });
    assert.equal(result.ok, false);
    assert.equal(result.paid, true);
    assert.equal(result.card.status, "paid");
    assert.equal(result.webhookFired, false);
    assert.equal(result.error, NEXT_STEPS_UNCONFIGURED_ERROR);
    assert.equal(fired, 0);
    const stored = await env.INVOICE_STORE.get(LIST_KEY, "json");
    assert.equal(stored[0].status, "paid");
    assert.equal(stored[0].nextStepsWebhookSentAt, undefined);
  });

  it("keeps paid and asks for retry when the webhook fails", async () => {
    const env = envWithCards([sampleCard()], { NEXT_STEPS_WEBHOOK_URL: "https://hooks.example.test/next-steps" });
    const result = await markPaidAndNotify(env, "CBS-2026-120", "james@cbshippingsolutions.com", async () => {
      return new Response("nope", { status: 500 });
    });
    assert.equal(result.ok, false);
    assert.equal(result.paid, true);
    assert.equal(result.error, NEXT_STEPS_RETRY_ERROR);
    assert.equal(result.card.nextStepsWebhookSentAt, undefined);
    const stored = await env.INVOICE_STORE.get(LIST_KEY, "json");
    assert.equal(stored[0].status, "paid");
    assert.equal(stored[0].nextStepsWebhookSentAt, undefined);
  });

  it("retries the webhook after a failed notify without changing the first paidAt", async () => {
    const env = envWithCards(
      [sampleCard({ status: "paid", paidAt: "2026-09-09T12:00:00.000Z", paidBy: "james@cbshippingsolutions.com" })],
      { NEXT_STEPS_WEBHOOK_URL: "https://hooks.example.test/next-steps" },
    );
    const result = await markPaidAndNotify(env, "CBS-2026-120", "aliyah@cbshippingsolutions.com", async () => {
      return new Response("ok", { status: 200 });
    });
    assert.equal(result.ok, true);
    assert.equal(result.webhookFired, true);
    assert.equal(result.card.paidAt, "2026-09-09T12:00:00.000Z");
    assert.equal(result.card.paidBy, "james@cbshippingsolutions.com");
    assert.ok(result.card.nextStepsWebhookSentAt);
  });

  it("signs the webhook body when NEXT_STEPS_WEBHOOK_SECRET is set", async () => {
    const secret = "house-next-steps";
    const env = envWithCards([sampleCard()], {
      NEXT_STEPS_WEBHOOK_URL: "https://hooks.example.test/next-steps",
      NEXT_STEPS_WEBHOOK_SECRET: secret,
    });
    let header = "";
    let raw = "";
    await markPaidAndNotify(env, "CBS-2026-120", "james@cbshippingsolutions.com", async (_url, init) => {
      raw = init.body;
      header = init.headers[NEXT_STEPS_SIGNATURE_HEADER];
      return new Response("ok", { status: 200 });
    });
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    assert.equal(header, `sha256=${expected}`);
    assert.equal(`sha256=${await hmacSha256Hex(secret, raw)}`, header);
  });
});
