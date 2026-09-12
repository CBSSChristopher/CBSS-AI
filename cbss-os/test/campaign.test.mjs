import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addCampaign, listCampaign, returnCampaign } from "../src/campaign.ts";

function mockEnv() {
  const bag = new Map();
  return {
    SESSIONS: {
      get: async (key) => bag.get(key) ?? null,
      put: async (key, value) => {
        bag.set(key, value);
      },
    },
  };
}

describe("email campaign hold", () => {
  it("holds a lead on the campaign list and can return them", async () => {
    const env = mockEnv();
    const added = await addCampaign(env, {
      id: "99",
      name: "Test Lead",
      email: "lead@example.com",
      phone: "8705550100",
      city: "Corning",
      owner: "Brittni Keeling",
      addedBy: "Christopher Banks",
      addedAt: "2026-08-29T19:00:00.000Z",
    });
    assert.equal(added.length, 1);
    assert.equal(added[0].id, "99");
    const listed = await listCampaign(env);
    assert.equal(listed[0].name, "Test Lead");
    const back = await returnCampaign(env, "99");
    assert.equal(back.length, 0);
  });

  it("keeps a bad-number reason when the same lead is added again as a hold", async () => {
    const env = mockEnv();
    await addCampaign(env, {
      id: "12",
      name: "Pat Lee",
      email: "pat@example.com",
      phone: "8705550199",
      city: "Corning",
      owner: "James",
      addedBy: "James",
      addedAt: "2026-09-12T16:00:00.000Z",
      reason: "bad_number",
    });
    const again = await addCampaign(env, {
      id: "12",
      name: "Pat Lee",
      email: "pat@example.com",
      phone: "8705550199",
      city: "Corning",
      owner: "James",
      addedBy: "James",
      addedAt: "2026-09-12T16:05:00.000Z",
      reason: "hold",
    });
    assert.equal(again[0].reason, "bad_number");
  });
});
