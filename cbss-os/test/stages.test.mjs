import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lifecycleForStage, normalizeStage, stageMatches, STAGES } from "../src/stages.ts";
import { applyBookStage, ingestInbound, logTouch, publicCycle } from "../src/cycle/engine.ts";
import { emptyRecord, writeRecord } from "../src/cycle/store.ts";
import { handleCycleAuthed } from "../src/cycle/http.ts";
import { pageHtml } from "../src/page.ts";

const james = { email: "james@cbshippingsolutions.com", name: "James", title: "Business Developer", lastLogin: "2026-09-13T00:00:00Z" };

function envUsers(users, bag = {}) {
  const store = new Map();
  store.set("cycle:users", users);
  return {
    SESSIONS: {
      async get(key, type) {
        const val = store.get(key);
        if (val == null) return null;
        return type === "json" ? val : JSON.stringify(val);
      },
      async put(key, value) {
        store.set(key, typeof value === "string" ? JSON.parse(value) : value);
      },
    },
    bag: store,
  };
}

describe("one stage language", () => {
  it("maps old Kanban names onto one list", () => {
    assert.equal(normalizeStage("New Lead"), "New");
    assert.equal(normalizeStage("Contacted"), "Working");
    assert.equal(normalizeStage("CTE in progress"), "Working");
    assert.equal(normalizeStage("Follow up in progress"), "Follow-up");
    assert.equal(normalizeStage("Quote"), "Quoted");
    assert.equal(normalizeStage("Flex Buy"), "Quoted");
    assert.equal(normalizeStage("Won"), "Paid");
    assert.equal(lifecycleForStage("Proposal Sent"), "Quoted");
    assert.equal(lifecycleForStage("DNC"), "Lost");
    assert.equal(stageMatches("New Lead", "New"), true);
    assert.ok(STAGES.includes("Not interested"));
    assert.ok(STAGES.includes("Bought elsewhere"));
  });

  it("puts that same list on the contact card and pipeline", () => {
    const page = pageHtml();
    for (const stage of STAGES) assert.match(page, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(page, /data-touch="call"/);
    assert.match(page, /data-touch="text"/);
    assert.match(page, /crm-monday-tab/);
    assert.match(page, /No AgentMail on this card yet/);
    assert.doesNotMatch(page, /id="cycle-life"/);
  });
});

describe("call and text log", () => {
  it("timestamps a call outcome without sending CTE mail", async () => {
    const env = envUsers([james]);
    const hint = { id: "touch-1", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await logTouch(env, hint, { channel: "call", outcome: "Connected" }, "James");
    assert.equal(result.error, undefined);
    assert.match(result.rec.events[0].text, /Call · Connected/);
    assert.equal(result.rec.sends.cte1, undefined);
    const bad = await logTouch(env, hint, { channel: "call", outcome: "Maybe later" }, "James");
    assert.equal(bad.error, "Pick how the call went.");
  });

  it("stops the ladder when a text says they replied", async () => {
    const env = envUsers([james]);
    const hint = { id: "touch-2", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await logTouch(env, hint, { channel: "text", outcome: "They replied" }, "James");
    assert.equal(result.rec.stopped, true);
    assert.ok(result.rec.events.some((e) => /Text · They replied/.test(e.text) || /Ladder stopped/.test(e.text)));
  });
});

describe("AgentMail on the card", () => {
  it("keeps inbound subject and preview after the ladder is already stopped", async () => {
    const env = envUsers([james]);
    const rec = emptyRecord("mail-1");
    rec.clientEmail = "pat@test.com";
    rec.threadIds = ["thr-1"];
    rec.stopped = true;
    rec.stoppedReason = "Rep clicked Replied";
    rec.mail = [];
    await writeRecord(env, rec);
    const n = await ingestInbound(env, {
      threadId: "thr-1",
      messageId: "msg-9",
      from: "pat@test.com",
      subject: "Still need a 40HC",
      text: "Yes still need it. Do not invent a price.",
    });
    assert.equal(n, 1);
    const again = await env.SESSIONS.get("cycle:rec:mail-1", "json");
    assert.equal(again.mail[0].direction, "in");
    assert.equal(again.mail[0].subject, "Still need a 40HC");
    assert.match(again.mail[0].preview, /Yes still need it/);
    const pub = publicCycle(again);
    assert.equal(pub.mail[0].subject, "Still need a 40HC");
  });
});

describe("book stage writes one language", () => {
  it("parks DNC without sending a lost email", async () => {
    const env = envUsers([james]);
    const hint = { id: "dnc-1", name: "Pat Lee", email: "pat@test.com", owner: "James" };
    const result = await applyBookStage(env, hint, "DNC", "James", async () => {
      throw new Error("should not send");
    });
    assert.equal(result.bookStatus, "DNC");
    assert.equal(result.rec.stopped, true);
    assert.equal(result.rec.stoppedReason, "DNC");
  });

  it("accepts /cycle/stage and /cycle/touch", async () => {
    const env = envUsers([james]);
    const user = { email: james.email, name: james.name };
    const stage = await handleCycleAuthed("/cycle/stage", "POST", env, user, {
      id: "http-1",
      name: "Pat Lee",
      email: "pat@test.com",
      owner: "James",
      stage: "Follow-up",
    }, new URLSearchParams());
    assert.equal(stage.status, 200);
    assert.equal(stage.body.bookStatus, "Follow-up");
    const touch = await handleCycleAuthed("/cycle/touch", "POST", env, user, {
      id: "http-1",
      channel: "call",
      outcome: "Voicemail",
    }, new URLSearchParams());
    assert.equal(touch.body.ok, true);
    assert.match(touch.body.cycle.events[0].text, /Call · Voicemail/);
  });
});
