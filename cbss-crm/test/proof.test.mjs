import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROOF_KV_KEY,
  redactSensitive,
  applyPublicFlag,
  publicPhotoFeed,
  addTimelineEvent,
  setHauler,
  addCommunication,
  linkCrmNotes,
  searchOrders,
  buildProofPdf,
  jpegSize,
  emptyProofRecord,
  handleOrderProof
} from "../src/proof.js";

const TINY_JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
  0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
  0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
  0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
  0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
  0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
  0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
  0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
  0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
  0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
  0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9
]);

const PAN = "4111111111111111";

test("redacts card and labeled bank numbers and keeps a phone", () => {
  const text = redactSensitive("card " + PAN + " routing 021000021 phone 555-123-4567");
  assert.equal(text.includes(PAN), false);
  assert.equal(text.includes("021000021"), false);
  assert.match(text, /555-123-4567/);
  assert.match(text, /\*\*\*\*1111/);
  assert.match(text, /\*\*\*\*0021/);
});

test("public feed is city and date only", () => {
  const blocked = applyPublicFlag({ type: "payment" }, { publicOk: true, city: "Dallas", date: "2026-09-17" });
  assert.equal(blocked.ok, false);
  const missing = applyPublicFlag({ type: "delivery-photo" }, { publicOk: true, city: "", date: "2026-09-17" });
  assert.equal(missing.ok, false);
  const ok = applyPublicFlag({ id: "p1", type: "delivery-photo" }, { publicOk: true, city: "Dallas", date: "2026-09-17" });
  assert.equal(ok.ok, true);
  const feed = publicPhotoFeed({
    "d-1": {
      contactId: "9",
      attachments: [
        ok.attachment,
        { id: "p2", type: "delivery-photo", publicOk: false, publicCity: "Austin", publicDate: "2026-09-01" },
        { id: "p3", type: "payment", publicOk: true, publicCity: "Dallas", publicDate: "2026-09-01", payment: { reference: PAN } }
      ]
    }
  });
  assert.deepEqual(feed.items, [{ id: "p1", city: "Dallas", date: "2026-09-17", kind: "delivery-photo" }]);
  const packed = JSON.stringify(feed);
  assert.equal(packed.includes("@"), false);
  assert.equal(packed.includes(PAN), false);
  assert.equal(packed.includes("contactId"), false);
});

test("timeline, hauler, notes, and search", () => {
  let rec = emptyProofRecord("d-900", "42", "900");
  const timeline = addTimelineEvent(rec, { kind: "delivered", at: "2026-09-18T15:00:00.000Z", note: "Left at gate" }, "Christopher Banks");
  assert.equal(timeline.ok, true);
  rec = timeline.record;
  assert.equal(rec.timeline[0].kind, "delivered");
  assert.equal(rec.timeline[0].by, "Christopher Banks");
  rec = setHauler(rec, {
    name: "North Haul",
    phone: "214-555-0199",
    rate: "850",
    amountPaid: "850",
    paidDate: "2026-09-19",
    acknowledged: true,
    note: "Paid acct " + PAN
  }, "Christopher Banks").record;
  assert.equal(rec.hauler.name, "North Haul");
  assert.equal(rec.hauler.acknowledged, true);
  assert.equal(rec.hauler.note.includes(PAN), false);
  rec = linkCrmNotes(rec, [{ author: "Desk", timestamp: "2026-09-01 10:00", text: "Called about delivery" }], "CRM").record;
  assert.equal(rec.communications[0].channel, "crm-note");
  const again = linkCrmNotes(rec, [{ author: "Desk", timestamp: "2026-09-01 10:00", text: "Called about delivery" }], "CRM");
  assert.equal(again.linked, 0);
  const matches = searchOrders({
    contacts: [{ id: "42", name: "Ada Lopez", email: "ada@example.com", phone: "555-123-4567", city: "Dallas" }],
    deals: [{ id: "900", contactId: "42", name: "Ada Lopez - Container" }],
    proofBook: { "d-900": Object.assign({}, rec, { orderRef: "SO-4525" }) },
    query: "5551234567"
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].hasProof, true);
  assert.equal(searchOrders({
    contacts: [{ id: "42", name: "Ada Lopez", email: "ada@example.com", phone: "555-123-4567", city: "Dallas" }],
    deals: [{ id: "900", contactId: "42" }],
    proofBook: {},
    query: "ada@example.com"
  })[0].contactId, "42");
  assert.equal(searchOrders({
    contacts: [{ id: "42", name: "Ada Lopez", email: "ada@example.com", phone: "555-123-4567" }],
    deals: [{ id: "900", contactId: "42" }],
    proofBook: { "d-900": { key: "d-900", contactId: "42", dealId: "900", orderRef: "SO-4525", attachments: [], timeline: [], communications: [], hauler: {} } },
    query: "SO-4525"
  })[0].orderRef, "SO-4525");
});

test("proof packet pdf redacts the card number and embeds a delivery photo", () => {
  assert.deepEqual(jpegSize(TINY_JPEG), { width: 1, height: 1 });
  const record = emptyProofRecord("d-900", "42", "900");
  record.orderRef = "SO-4525";
  record.timeline = [{ id: "t1", kind: "paid", at: "2026-09-17", by: "Christopher Banks", note: "", proofIds: [] }];
  record.hauler = { name: "North Haul", phone: "214-555-0199", rate: "850", amountPaid: "850", paidDate: "2026-09-19", paymentProofId: "p9", acknowledged: true, acknowledgedAt: "2026-09-19", acknowledgedBy: "Christopher Banks", note: "" };
  record.attachments = [{
    id: "p9",
    type: "payment",
    filename: "wire.pdf",
    payment: { method: "wire", date: "2026-09-17", amount: "4525", reference: PAN }
  }];
  record.communications = [{ channel: "agentmail", at: "2026-09-17", by: "Harbor", summary: "Thread on the wire", externalId: "thread-1", direction: "in" }];
  const pdf = buildProofPdf({
    generatedAt: "2026-10-23T00:00:00.000Z",
    generatedBy: "Christopher Banks",
    contact: { id: "42", name: "Ada Lopez", email: "ada@example.com", phone: "555-123-4567", city: "Dallas" },
    deal: { id: "900", name: "Ada Lopez - Container", stage: "Won", amount: 4525, container: "40ft", payment: "wire" },
    record,
    images: [{ bytes: TINY_JPEG, label: "Delivery photo Dallas" }]
  });
  const text = new TextDecoder("latin1").decode(pdf);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  const xref = text.match(/startxref\n(\d+)\n%%EOF/);
  assert.ok(xref);
  assert.equal(text.slice(Number(xref[1]), Number(xref[1]) + 4), "xref");
  assert.match(text, /Ada Lopez/);
  assert.match(text, /North Haul/);
  assert.match(text, /delivered|paid/);
  assert.equal(text.includes(PAN), false);
  assert.match(text, /\*\*\*\*1111/);
  assert.match(text, /DCTDecode/);
});

function memoryHarness(opts) {
  const kv = new Map();
  const written = [];
  const files = new Map();
  const contacts = [{
    id: "42",
    name: "Ada Lopez",
    email: "ada@example.com",
    phone: "555-123-4567",
    city: "Dallas",
    notes: [{ author: "Desk", timestamp: "2026-09-01 10:00", text: "Called about delivery" }]
  }];
  const state = {
    deals: [{ id: "900", contactId: "42", name: "Ada Lopez - Container", stage: "Won", amount: 4525, container: "40ft", payment: "wire", depot: "Dallas" }],
    followups: {},
    notes: { "42": contacts[0].notes },
    contactsAdded: [],
    contactEdits: {},
    proposals: {},
    archiveRequests: {},
    completedTasks: {}
  };
  const store = {
    async get(key, options) {
      if (!kv.has(key)) return null;
      const value = kv.get(key);
      return options && options.type === "json" ? JSON.parse(JSON.stringify(value)) : value;
    },
    async setJSON(key, value) {
      written.push(key);
      kv.set(key, JSON.parse(JSON.stringify(value)));
    }
  };
  const bucket = {
    async put(key, body) {
      files.set(key, body instanceof Uint8Array ? body : new Uint8Array(body));
    },
    async get(key) {
      const body = files.get(key);
      if (!body) return null;
      return { arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) };
    },
    async delete(key) { files.delete(key); }
  };
  const env = { PROOF_BUCKET: opts && opts.noBucket ? undefined : bucket };
  const deps = {
    requireSession: async () => (opts && opts.user === null ? null : { name: "Proof Desk", email: "proof.desk@cbshippingsolutions.com" }),
    jsonResponse: (_request, status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
    corsHeaders: (_request, extra) => Object.assign({ "Content-Type": "application/json" }, extra || {}),
    openStore: () => store,
    loadArchive: async () => contacts,
    readState: async () => state,
    applyApprovedArchives() {},
    applyEdits() {},
    attachStoredNotes() {},
    normalizePath: (pathname) => pathname
  };
  return { env, deps, written, files, kv };
}

async function callProof(path, init, harness) {
  const req = new Request("https://crm.test" + path, init);
  const res = await handleOrderProof(req, harness.env, harness.deps);
  const type = res.headers.get("content-type") || "";
  if (type.includes("json")) return { status: res.status, json: await res.json(), res };
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, bytes, res };
}

test("order proof routes stay off the deal book", async () => {
  const harness = memoryHarness();
  const denied = await callProof("/order-proof?contactId=42", { method: "GET" }, memoryHarness({ user: null }));
  assert.equal(denied.status, 401);
  const anon = memoryHarness({ user: null });
  const publicWrite = await callProof("/order-proof/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addTimeline", contactId: "42", kind: "paid" })
  }, anon);
  assert.equal(publicWrite.status, 405);
  assert.deepEqual(anon.written, []);

  const timeline = await callProof("/order-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addTimeline", contactId: "42", dealId: "900", kind: "paid", at: "2026-09-17T12:00:00.000Z", note: "Wire posted" })
  }, harness);
  assert.equal(timeline.status, 200);
  assert.equal(timeline.json.record.timeline[0].kind, "paid");
  assert.deepEqual(harness.written, [PROOF_KV_KEY]);

  const noBucket = memoryHarness({ noBucket: true });
  const uploadDenied = await callProof("/order-proof/upload", {
    method: "POST",
    body: (() => {
      const form = new FormData();
      form.set("contactId", "42");
      form.set("dealId", "900");
      form.set("type", "payment");
      form.set("paymentMethod", "wire");
      form.set("paymentDate", "2026-09-17");
      form.set("paymentAmount", "4525");
      form.set("paymentReference", PAN);
      form.set("file", new File([new Uint8Array([1, 2, 3])], "wire.pdf", { type: "application/pdf" }));
      return form;
    })()
  }, noBucket);
  assert.equal(uploadDenied.status, 503);
  assert.equal(uploadDenied.json.code, "PROOF_BUCKET_NOT_CONFIGURED");

  const form = new FormData();
  form.set("contactId", "42");
  form.set("dealId", "900");
  form.set("type", "delivery-photo");
  form.set("publicOk", "1");
  form.set("city", "Dallas");
  form.set("date", "2026-09-18");
  form.set("file", new File([TINY_JPEG], "yard.jpg", { type: "image/jpeg" }));
  const uploaded = await callProof("/order-proof/upload", { method: "POST", body: form }, harness);
  assert.equal(uploaded.status, 200);
  const photo = uploaded.json.record.attachments[0];
  assert.equal(photo.publicOk, true);
  assert.equal(harness.files.size, 1);

  const pay = new FormData();
  pay.set("contactId", "42");
  pay.set("type", "payment");
  pay.set("paymentMethod", "wire");
  pay.set("paymentDate", "2026-09-17");
  pay.set("paymentAmount", "4525");
  pay.set("paymentReference", PAN);
  pay.set("file", new File([new Uint8Array([1, 2, 3])], "wire.pdf", { type: "application/pdf" }));
  const paid = await callProof("/order-proof/upload", { method: "POST", body: pay }, harness);
  assert.equal(paid.status, 200);
  assert.equal(paid.json.record.attachments.some((f) => f.payment && f.payment.reference === "****1111"), true);
  assert.equal(JSON.stringify(paid.json.record).includes(PAN), false);

  const lookup = await callProof("/order-proof/lookup?q=" + encodeURIComponent("ada@example.com"), { method: "GET" }, harness);
  assert.equal(lookup.json.matches[0].name, "Ada Lopez");
  assert.equal(lookup.json.matches[0].hasProof, true);

  const packet = await callProof("/order-proof/packet?contactId=42&dealId=900", { method: "GET" }, harness);
  assert.equal(packet.status, 200);
  assert.equal(packet.res.headers.get("content-type"), "application/pdf");
  const pdfText = new TextDecoder("latin1").decode(packet.bytes);
  assert.ok(pdfText.startsWith("%PDF-1.4"));
  assert.equal(pdfText.includes(PAN), false);
  assert.match(pdfText, /Dallas/);

  const openPublic = memoryHarness({ user: null });
  openPublic.kv.set(PROOF_KV_KEY, harness.kv.get(PROOF_KV_KEY));
  openPublic.env.PROOF_BUCKET = harness.env.PROOF_BUCKET;
  const feed = await callProof("/order-proof/public", { method: "GET" }, openPublic);
  assert.equal(feed.status, 200);
  assert.equal(feed.json.items.length, 1);
  assert.deepEqual(Object.keys(feed.json.items[0]).sort(), ["city", "date", "id", "kind"]);
  const pub = await callProof("/order-proof/public-file?id=" + photo.id, { method: "GET" }, openPublic);
  assert.equal(pub.status, 200);
  assert.equal(pub.res.headers.get("content-disposition"), "inline; filename=\"delivery.jpg\"");
  assert.equal(pub.bytes.length, TINY_JPEG.length);

  const linked = await callProof("/order-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addCommunication",
      contactId: "42",
      channel: "agentmail",
      externalId: "thread-1427392",
      summary: "Customer thread, card " + PAN
    })
  }, harness);
  assert.equal(linked.status, 200);
  assert.equal(JSON.stringify(linked.json.record.communications).includes(PAN), false);
  assert.equal(harness.written.every((key) => key === PROOF_KV_KEY), true);
});

test("crm page script still parses", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(script);
  new Function(script[1]);
});
