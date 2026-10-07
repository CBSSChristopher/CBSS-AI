import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickDialedHarborLead, dialedKey, harborPriorPull, harborMarkPull, harborWasPulled } from "../src/va/harbor-dialed.ts";

const book = [
  { id: 1, name: "Queue Head", phone: "5550000001", owner: "New/Unassigned", status: "New Lead" },
  { id: 2, name: "Kevin", phone: "(859) 327-2355", owner: "New/Unassigned", status: "New Lead" },
  { id: 3, name: "Harbor Card", phone: "9167055347", owner: "Harbor", status: "Working", cteStage: "CTE2" },
  { id: 4, name: "James Card", phone: "4045550000", owner: "James", status: "Working" },
  { id: 5, name: "DNC", phone: "3125550000", owner: "New/Unassigned", dnc: true },
];

describe("Harbor dialed-number lookup", () => {
  it("returns the card for the dialed number, not the queue head", () => {
    const p = pickDialedHarborLead(book, "+18593272355");
    assert.equal(p.contact.id, 2);
    assert.equal(p.source, "new-unassigned");
  });
  it("keeps Harbor follow-ups as follow-up", () => {
    assert.equal(pickDialedHarborLead(book, "+19167055347").source, "follow-up");
  });
  it("never hands out a queue card on no match", () => {
    const p = pickDialedHarborLead(book, "+12125550199");
    assert.equal(p.contact, null);
    assert.equal(p.reason, "no_match");
  });
  it("refuses the Harbor line, other reps, DNC, and empty numbers", () => {
    assert.equal(pickDialedHarborLead(book, "+18703804010").reason, "harbor_line");
    assert.equal(pickDialedHarborLead(book, "+14045550000").reason, "not_harbor_lead");
    assert.equal(pickDialedHarborLead(book, "+13125550000").reason, "closed");
    assert.equal(pickDialedHarborLead(book, "").reason, "no_dialed_number");
    assert.equal(pickDialedHarborLead(book, "{{system__called_number}}").reason, "no_dialed_number");
  });
  it("normalizes to last 10 digits", () => {
    assert.equal(dialedKey("+1 (859) 327-2355"), "8593272355");
  });
  it("one pull per call via KV", async () => {
    const m = new Map();
    const kv = { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } };
    assert.equal(await harborPriorPull(kv, "+18593272355", "conv_1"), "");
    await harborMarkPull(kv, "+18593272355", "conv_1", "2");
    assert.equal(await harborPriorPull(kv, "+18593272355", "conv_1"), "2");
    assert.equal(await harborPriorPull(kv, "8593272355", ""), "2");
    assert.equal(await harborWasPulled(kv, "2"), true);
    assert.equal(await harborWasPulled(kv, "1"), false);
  });
});
