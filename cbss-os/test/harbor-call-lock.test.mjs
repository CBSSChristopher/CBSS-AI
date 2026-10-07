import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampHarborCallCte,
  cycleMailedWithin,
  decideHarborCallOutcome,
  freshHarborCall,
  harborCallKey,
  recordHarborCallOutcome,
} from "../src/va/harbor-call-lock.ts";

function memKv() {
  const m = new Map();
  return {
    m,
    get: async (k, type) => {
      const v = m.has(k) ? m.get(k) : null;
      if (v == null) return null;
      return type === "json" ? JSON.parse(v) : v;
    },
    put: async (k, v) => { m.set(k, String(v)); },
    delete: async (k) => { m.delete(k); },
    list: async () => ({ keys: [...m.keys()].map((name) => ({ name })), list_complete: true }),
  };
}

describe("Harbor one-outcome-per-call decisions", () => {
  it("first no-answer advances one step and may email", () => {
    const s = freshHarborCall("k", "1", "CTE1");
    const d = decideHarborCallOutcome(s, "no-answer", "CTE2");
    assert.deepEqual([d.repeat, d.noteOnly, d.cteStage, d.allowMail], [false, false, "CTE2", true]);
  });
  it("second no-answer on the same call is folded: no step, no email (Keith Ball, Oct 7)", () => {
    let s = freshHarborCall("k", "1", "CTE1");
    s = recordHarborCallOutcome(s, "no-answer", { cteStage: "CTE2", mailed: true, mailStep: "cte1" });
    const d = decideHarborCallOutcome(s, "no-answer", "CTE3");
    assert.equal(d.repeat, true);
    assert.equal(d.noteOnly, true);
    assert.equal(d.cteStage, "CTE2");
    assert.equal(d.allowMail, false);
  });
  it("voicemail after no-answer is folded too", () => {
    let s = freshHarborCall("k", "1", "CTE2");
    s = recordHarborCallOutcome(s, "no-answer", { cteStage: "CTE3", mailed: true });
    const d = decideHarborCallOutcome(s, "voicemail", "CTE4");
    assert.equal(d.noteOnly, true);
    assert.equal(d.cteStage, "CTE3");
  });
  it("answered then soft-delay still books the follow-up and its one email", () => {
    let s = freshHarborCall("k", "1", "CTE2");
    s = recordHarborCallOutcome(s, "answered", { cteStage: "CTE2", mailed: false });
    const d = decideHarborCallOutcome(s, "soft-delay", "CTE2");
    assert.deepEqual([d.noteOnly, d.cteStage, d.allowMail], [false, "CTE2", true]);
  });
  it("no-answer then soft-delay applies the follow-up but sends no second email", () => {
    let s = freshHarborCall("k", "1", "CTE1");
    s = recordHarborCallOutcome(s, "no-answer", { cteStage: "CTE2", mailed: true });
    const d = decideHarborCallOutcome(s, "soft-delay", "CTE2");
    assert.deepEqual([d.noteOnly, d.cteStage, d.allowMail], [false, "CTE2", false]);
  });
  it("a DNC after a no-answer still lands (never swallowed)", () => {
    let s = freshHarborCall("k", "1", "CTE1");
    s = recordHarborCallOutcome(s, "no-answer", { cteStage: "CTE2", mailed: true });
    const d = decideHarborCallOutcome(s, "DNC", "CTE2");
    assert.equal(d.noteOnly, false);
    assert.equal(d.cteStage, "CTE2");
  });
  it("a recent CTE email on the cycle record blocks a second step and email even if the call key was lost", () => {
    const s = freshHarborCall("k", "1", "CTE2");
    const d = decideHarborCallOutcome(s, "no-answer", "CTE3", { recentMail: true });
    assert.equal(d.cteStage, "CTE2");
    assert.equal(d.allowMail, false);
  });
  it("clamps update_lead jumps to one step per call", () => {
    const s = freshHarborCall("k", "1", "CTE1");
    assert.equal(clampHarborCallCte(s, "CTE4"), "CTE2");
    const moved = recordHarborCallOutcome(s, "no-answer", { cteStage: "CTE2", mailed: true });
    assert.equal(clampHarborCallCte(moved, "CTE3"), "CTE2");
  });
  it("cycleMailedWithin looks only at the last 10 minutes", () => {
    const now = new Date("2026-10-07T18:34:00Z");
    assert.equal(cycleMailedWithin({ sends: { cte1: { status: "sent", sentAt: "2026-10-07T18:33:02Z" } } }, 600, now), true);
    assert.equal(cycleMailedWithin({ sends: { cte1: { status: "sent", sentAt: "2026-10-07T18:10:00Z" } } }, 600, now), false);
    assert.equal(cycleMailedWithin({ sends: { cte2: { status: "pending", dueAt: "2026-10-08T10:00" } } }, 600, now), false);
    assert.equal(cycleMailedWithin(null, 600, now), false);
  });
  it("call key: pull stamp first, then conversation id, then a 10-minute contact+number window", async () => {
    const kv = memKv();
    assert.match(await harborCallKey(kv, "7", { dialed: "+13195724829" }), /^harbor:call:w:7:3195724829$/);
    assert.match(await harborCallKey(kv, "7", { conversationId: "conv_1" }), /^harbor:call:c:conv_1:7$/);
    assert.match(await harborCallKey(kv, "7", { conversationId: "{{system__conversation_id}}" }), /^harbor:call:w:7:-$/);
    await kv.put("harbor:pulled:id:7", "1791400000000");
    assert.equal(await harborCallKey(kv, "7", { conversationId: "conv_1" }), "harbor:call:p:7:1791400000000");
  });
});

/* ---------- Route-level replay of the Oct 7 Keith Ball call against the real Worker fetch handler ---------- */

function fakeCrm(card) {
  const state = { edits: {}, notes: [], followups: {}, writes: [] };
  const view = () => ({ ...card, ...(state.edits[String(card.id)] || {}) });
  const crm = {
    fetch: async (req) => {
      const url = new URL(req.url);
      if (url.pathname === "/auth/login") {
        return new Response(JSON.stringify({ ok: true, user: { name: "Harbor" } }), {
          headers: { "Content-Type": "application/json", "Set-Cookie": "cbss_session=t; Path=/" },
        });
      }
      if (url.pathname === "/crm-data" && req.method === "GET") {
        return Response.json({ contactsAdded: [view()], contacts: [], followups: state.followups });
      }
      if (url.pathname === "/crm-data") {
        const body = await req.json();
        state.writes.push(body.action);
        if (body.action === "saveContactEdits") {
          for (const [id, patch] of Object.entries(body.contactEdits || {})) state.edits[id] = { ...(state.edits[id] || {}), ...patch };
        } else if (body.action === "appendNote") {
          state.notes.push(body.text);
        } else if (body.action === "saveFollowups") {
          Object.assign(state.followups, body.followups || {});
        }
        return Response.json({ ok: true });
      }
      return new Response("nf", { status: 404 });
    },
  };
  return { crm, state, view };
}

async function harborEnv(card) {
  const kv = memKv();
  const { crm, state, view } = fakeCrm(card);
  const env = {
    SESSIONS: kv,
    CRM: crm,
    CRM_ORIGIN: "https://cbsscrm.example",
    VA_ENABLED: "true",
    VA_DIAL_ARMED: "true",
    VA_CRM_EMAIL: "harbor@example.test",
    VA_CRM_PASSWORD: "x",
    HARBOR_QUOTE_TOKEN: "tok",
    AGENTMAIL_API_KEY: "test-key",
    AGENTMAIL_INBOX: "cbss@agentmail.to",
    TWILIO_PHONE_NUMBER: "+18703804010",
    AUTH_SECRET: "s",
  };
  return { env, kv, state, view };
}

async function call(worker, env, path, body) {
  const res = await worker.fetch(new Request("https://floor.cbshippingsolutions.app" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Harbor-Token": "tok" },
    body: JSON.stringify(body),
  }), env, { waitUntil() {}, passThroughOnException() {} });
  return { status: res.status, body: await res.json() };
}

describe("Harbor log_outcome route: one outcome email per call", () => {
  it("replays Keith Ball's double no-answer: one email, one step, second get_next_lead changes nothing", async () => {
    const sent = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      if (/agentmail/.test(url)) {
        sent.push(JSON.parse(init.body));
        return Response.json({ message_id: "<m" + sent.length + ">", thread_id: "t" + sent.length });
      }
      throw new Error("unexpected network call in test: " + url);
    };
    try {
      const worker = (await import("../src/index.ts")).default;
      const card = { id: 1789170386728, name: "Test Keith", email: "keith@example.test", phone: "3195550123", owner: "New/Unassigned", status: "New Lead" };
      const { env, state, view } = await harborEnv(card);
      const conv = "conv_test_1";

      const pull = await call(worker, env, "/va/harbor/get-next-lead", { phone: "+13195550123", conversation_id: conv });
      assert.equal(pull.body.matched_phone, true);
      assert.equal(view().cteStage, "CTE1");

      const first = await call(worker, env, "/va/harbor/log-outcome", { contactId: "1789170386728", outcome: "no-answer" });
      assert.equal(first.status, 200);
      assert.equal(first.body.mail.required, true);
      assert.equal(first.body.mail.step, "cte1");
      assert.equal(view().cteStage, "CTE2");
      assert.equal(sent.length, 1);

      const editsBefore = JSON.stringify(state.edits);
      const again = await call(worker, env, "/va/harbor/get-next-lead", { phone: "+13195550123", conversation_id: conv });
      assert.equal(again.body.already_pulled, true);
      assert.equal(again.body.outcome_logged, true);
      assert.equal(again.body.contact.id, "1789170386728");
      assert.equal(JSON.stringify(state.edits), editsBefore, "repeat get_next_lead must not write");

      const second = await call(worker, env, "/va/harbor/log-outcome", { contactId: "1789170386728", outcome: "no-answer" });
      assert.equal(second.status, 200);
      assert.equal(second.body.duplicate_call_outcome, true);
      assert.equal(second.body.mail.required, false);
      assert.equal(view().cteStage, "CTE2", "card must not move to CTE3");
      assert.equal(sent.length, 1, "exactly one outcome email for the call");
      assert.match(state.notes.at(-1), /already logged on this call/);

      const third = await call(worker, env, "/va/harbor/log-outcome", { contactId: "1789170386728", outcome: "voicemail" });
      assert.equal(third.body.duplicate_call_outcome, true);
      assert.equal(sent.length, 1);
      assert.equal(view().cteStage, "CTE2");

      // A DNC later in the same call still lands, with no email.
      const dnc = await call(worker, env, "/va/harbor/log-outcome", { contactId: "1789170386728", outcome: "DNC" });
      assert.equal(dnc.status, 200);
      assert.equal(view().status, "DNC");
      assert.equal(sent.length, 1);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("a fresh call on a later pull still gets its own step and email", async () => {
    const sent = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      if (/agentmail/.test(url)) {
        sent.push(JSON.parse(init.body));
        return Response.json({ message_id: "<n" + sent.length + ">", thread_id: "u" + sent.length });
      }
      throw new Error("unexpected network call in test: " + url);
    };
    try {
      const worker = (await import("../src/index.ts")).default;
      const card = { id: 42, name: "Test Two", email: "two@example.test", phone: "5015550142", owner: "Harbor", status: "Working", cteStage: "CTE2" };
      const { env, kv, view } = await harborEnv(card);
      await call(worker, env, "/va/harbor/get-next-lead", { phone: "+15015550142", conversation_id: "c1" });
      const a = await call(worker, env, "/va/harbor/log-outcome", { contactId: "42", outcome: "no-answer" });
      assert.equal(a.body.mail.step, "cte2");
      assert.equal(view().cteStage, "CTE3");
      // Next day: pull keys expired, cycle send is old.
      for (const k of [...kv.m.keys()]) if (k.startsWith("harbor:pull:") || k.startsWith("harbor:pulled:") || k.startsWith("harbor:call:")) kv.m.delete(k);
      const rec = JSON.parse(kv.m.get("cycle:rec:42"));
      rec.sends.cte2.sentAt = new Date(Date.now() - 86_400_000).toISOString();
      kv.m.set("cycle:rec:42", JSON.stringify(rec));
      await call(worker, env, "/va/harbor/get-next-lead", { phone: "+15015550142", conversation_id: "c2" });
      const b = await call(worker, env, "/va/harbor/log-outcome", { contactId: "42", outcome: "no-answer" });
      assert.equal(b.body.mail.step, "cte3");
      assert.equal(view().cteStage, "CTE4");
      assert.equal(sent.length, 2);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
