import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { pageHtml } from "../src/page.ts";
import {
  buildImportedContact,
  mapLeadRecord,
  parseLeadCsv,
  planLeadImport,
} from "../src/va/leads-import.ts";
import {
  HARBOR_OWNER,
  POOL_OWNER,
  harborAssignPatch,
  harborOutcomePlan,
  isCallableHarborLead,
  isFixtureContact,
  pickHarborNext,
  resolveCloser,
} from "../src/va/workflow.ts";
import { normalizeStage } from "../src/stages.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("Meta CSV parse", () => {
  it("maps Meta headers and skips empty phones", () => {
    const csv = [
      "id,created_time,Full Name,Phone number,Email,company,What size box?,city",
      "lead_1,2026-09-22,Pat Lee,(870) 555-0199,pat@farm.example,Lee Farms,40HC,Jonesboro",
      "lead_2,2026-09-22,No Phone,,skip@example.com,Acme,20DC,Corning",
    ].join("\n");
    const parsed = parseLeadCsv(csv);
    assert.equal(parsed.skippedEmptyPhone, 1);
    assert.equal(parsed.rows[0].name, "Pat Lee");
    assert.equal(parsed.rows[0].phone, "(870) 555-0199");
    assert.equal(parsed.rows[0].extras.what_size_box, "40HC");
    assert.equal(parsed.rows[1].skipReason, "empty_phone");
  });

  it("builds first+last when full_name is missing", () => {
    const row = mapLeadRecord({ first_name: "Pat", last_name: "Lee", mobile: "8705550199" });
    assert.equal(row.name, "Pat Lee");
    assert.equal(row.skipReason, "");
  });
});

describe("CSV import parks on New/Unassigned, not New Lead", () => {
  it("creates real rows on the pile with book stage New", () => {
    const parsed = parseLeadCsv("full_name,phone\nAcme Welding,8705550199\n");
    const plan = planLeadImport(parsed.rows, []);
    assert.equal(plan.created, 1);
    assert.equal(plan.actions[0].action, "create");
    if (plan.actions[0].action !== "create") return;
    assert.equal(plan.actions[0].contact.owner, POOL_OWNER);
    assert.equal(plan.actions[0].contact.status, "New");
    assert.equal(plan.actions[0].contact.source, "facebook_lead_ads");
    assert.notEqual(plan.actions[0].contact.status, "New Lead");
    assert.equal(normalizeStage(plan.actions[0].contact.status), "New");
  });

  it("upserts on phone and does not steal a working assigned card", () => {
    const book = [{ id: "c1", name: "Pat Lee", phone: "870-555-0199", owner: "James", status: "Working" }];
    const plan = planLeadImport(parseLeadCsv("name,phone\nPat Lee,8705550199\n").rows, book);
    assert.equal(plan.updated, 1);
    assert.equal(plan.actions[0].action, "update");
    if (plan.actions[0].action !== "update") return;
    assert.equal(plan.actions[0].keepStage, true);
    assert.equal(plan.actions[0].patch.status, undefined);
    assert.equal(plan.actions[0].patch.owner, undefined);
  });

  it("never parks TEST fixtures on New/Unassigned", () => {
    const plan = planLeadImport(parseLeadCsv("name,phone,id\nTEST- Dummy,8705550100,test-lead\n").rows, []);
    assert.equal(plan.created, 0);
    assert.equal(plan.skippedFixture, 1);
    assert.equal(plan.actions[0].action, "skip");
    if (plan.actions[0].action === "skip") assert.equal(plan.actions[0].reason, "fixture");
    const row = buildImportedContact(parseLeadCsv("name,phone\nPat Lee,8705550199\n").rows[0]);
    assert.equal(isFixtureContact(row), false);
    assert.equal(isCallableHarborLead({ ...row, owner: POOL_OWNER }), true);
    assert.equal(isCallableHarborLead({ name: "TEST- Dummy", phone: "8705550100", owner: POOL_OWNER, facebookLeadId: "test-lead" }), false);
  });
});

describe("Harbor CTE workflow", () => {
  it("pulls New/Unassigned and assigns Harbor at CTE1", () => {
    const next = pickHarborNext([
      { id: "skip", name: "TEST- X", phone: "8705550100", owner: POOL_OWNER },
      { id: "dnc", name: "Gone", phone: "8705550111", owner: POOL_OWNER, status: "DNC" },
      { id: "real", name: "Acme Welding", phone: "8705550199", owner: POOL_OWNER, status: "New", source: "facebook_lead_ads" },
    ]);
    assert.equal(next && next.id, "real");
    const patch = harborAssignPatch("CTE1");
    assert.equal(patch.owner, HARBOR_OWNER);
    assert.equal(patch.status, "Working");
    assert.equal(patch.cteStage, "CTE1");
  });

  it("voicemail advances CTE; ready-to-buy hands to Christopher or Bryan", () => {
    const card = { id: "real", owner: HARBOR_OWNER, status: "Working", cteStage: "CTE1" };
    const vm = harborOutcomePlan(card, "voicemail");
    assert.equal(vm.status, "Working");
    assert.equal(vm.cteStage, "CTE2");
    assert.equal(vm.owner, HARBOR_OWNER);
    assert.match(vm.note, /Voicemail left/);
    const buy = harborOutcomePlan(card, "ready-to-buy", { closer: "Brian" });
    assert.equal(buy.status, "Ready to buy");
    assert.equal(buy.owner, "Bryan Reese");
    assert.equal(buy.handoff, true);
    assert.match(buy.note, /does not collect payment/);
    assert.match(buy.note, /wire \/ ACH/);
    assert.equal(resolveCloser("Bryan Reese"), "Bryan Reese");
    assert.equal(resolveCloser(""), "Christopher Banks");
  });

  it("answered stays on Harbor Working; DNC and not-interested close the card", () => {
    const card = { owner: HARBOR_OWNER, status: "Working", cteStage: "CTE2" };
    const ans = harborOutcomePlan(card, "answered", { note: "Wants a 40HC. No price invented." });
    assert.equal(ans.owner, HARBOR_OWNER);
    assert.equal(ans.status, "Working");
    assert.match(ans.note, /They answered/);
    assert.equal(harborOutcomePlan(card, "DNC").status, "DNC");
    assert.equal(harborOutcomePlan(card, "not-interested").status, "Not interested");
  });
});

describe("Yard wiring for CSV import and Harbor pull", () => {
  it("does not expose a Facebook lead webhook", () => {
    assert.doesNotMatch(index, /\/va\/hooks\/facebook-leads/);
    assert.doesNotMatch(index, /FB_WEBHOOK_VERIFY_TOKEN/);
    assert.match(index, /\/va\/leads\/import/);
    assert.match(index, /\/va\/harbor\/next/);
    assert.match(index, /\/va\/harbor\/outcome/);
    assert.match(index, /\/va\/harbor\/inbound/);
  });

  it("puts Import Meta CSV on the Christopher VA tab", () => {
    assert.match(page, /Import Meta CSV/);
    assert.match(page, /id="va-csv-file"/);
    assert.match(page, /Import to New\/Unassigned/);
    assert.match(page, /Ready to buy/);
    assert.match(page, /"Harbor"/);
    assert.match(page, /self-assigns, runs CTE/);
  });
});
