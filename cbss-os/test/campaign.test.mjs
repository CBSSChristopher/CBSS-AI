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
  it("moves a lead off the working book and can return them", async () => {
    const env = mockEnv();
    const added = await addCampaign(env, {
      id: "99",
      name: "Test Lead",
      email: "lead@example.com",
      phone: "8705550100",
      city: "Corning",
      owner: "Brittni",
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
});
