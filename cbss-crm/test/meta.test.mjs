import test from "node:test";
import assert from "node:assert/strict";
import {
  appAccessToken,
  appSubscriptionPayload,
  collectLeadgenEvents,
  ensureVerifyToken,
  facebookLeadTask,
  fieldMap,
  hasIdentity,
  mapLead,
  publicMetaStatus,
  resolveLeadOwner,
  verifyHandshake
} from "../src/meta.js";

test("maps Instant Form fields and assigns the form's rep", () => {
  const fields = fieldMap([
    { name: "full_name", values: ["Pat Lee"] },
    { name: "email", values: ["pat@example.com"] },
    { name: "phone_number", values: ["5551112222"] }
  ]);
  const payload = mapLead(fields, "note", {
    defaultOwner: "Christopher Banks",
    formOwners: { "111": "James" }
  }, { formId: "111", formName: "Yard form" });
  assert.equal(payload.name, "Pat Lee");
  assert.equal(payload.email, "pat@example.com");
  assert.equal(payload.owner, "James");
  assert.equal(payload.source, "Facebook Instant Form");
  assert.equal(payload.stage, "New Lead");
});

test("uses a rep question on the form before the form map", () => {
  assert.equal(resolveLeadOwner({ sales_rep: "kawika pangelinan" }, { defaultOwner: "Christopher Banks", formOwners: { "1": "James" } }, { formId: "1" }), "Kawika Pangelinan");
});

test("falls back to the default owner", () => {
  assert.equal(resolveLeadOwner({}, { defaultOwner: "Christopher Banks" }, {}), "Christopher Banks");
});

test("collects leadgen ids from a Page webhook body", () => {
  const events = collectLeadgenEvents({
    object: "page",
    entry: [{ id: "page1", changes: [{ field: "leadgen", value: { leadgen_id: "L1", form_id: "F1" } }] }]
  });
  assert.equal(events[0].id, "L1");
  assert.equal(events[0].formId, "F1");
});

test("webhook handshake returns the challenge", () => {
  const ok = verifyHandshake({ mode: "subscribe", token: "abc", challenge: "99" }, "abc");
  assert.equal(ok.ok, true);
  assert.equal(ok.challenge, "99");
  assert.equal(verifyHandshake({ mode: "subscribe", token: "nope", challenge: "99" }, "abc").ok, false);
});

test("public status never echoes the page token", () => {
  const status = publicMetaStatus({
    verifyToken: "cbss-x",
    pageAccessToken: "secret-token",
    pageId: "1",
    pageName: "CBSS",
    defaultOwner: "James"
  }, "https://cbsscrm.cbss.workers.dev/webhooks/meta-leadgen");
  assert.equal(status.hasPageToken, true);
  assert.equal(status.connected, true);
  assert.equal(status.pageName, "CBSS");
  assert.equal(JSON.stringify(status).includes("secret-token"), false);
});

test("new Facebook leads get a same-day call task", () => {
  const task = facebookLeadTask();
  assert.equal(task.nextAction, "Call — Facebook lead");
  assert.match(task.followUpDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test("identity requires a name, email, or phone", () => {
  assert.equal(hasIdentity({ name: "A" }), true);
  assert.equal(hasIdentity({ email: "a@b.com" }), true);
  assert.equal(hasIdentity({}), false);
});

test("ensureVerifyToken keeps an existing token", () => {
  const next = ensureVerifyToken({ verifyToken: "keep-me" }, "new");
  assert.equal(next.verifyToken, "keep-me");
});

test("app webhook payload points at the CRM callback", () => {
  assert.equal(appAccessToken("123", "secret"), "123|secret");
  assert.deepEqual(appSubscriptionPayload("https://cbsscrm.cbss.workers.dev/webhooks/meta-leadgen", "cbss-x"), {
    object: "page",
    callback_url: "https://cbsscrm.cbss.workers.dev/webhooks/meta-leadgen",
    verify_token: "cbss-x",
    fields: "leadgen",
    include_values: "true"
  });
});
