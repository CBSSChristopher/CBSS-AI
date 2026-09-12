import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { matchContactForProposal, proposalAttachPatch } from "../src/crm-proposal.ts";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("proposal attaches to the CRM contact", () => {
  const rows = [
    { id: "1", name: "Pat Lee", email: "pat@example.com", phone: "8705550100", owner: "James" },
    { id: "2", name: "Sam Ray", email: "sam@example.com", phone: "8705550199", owner: "James" },
  ];

  it("matches by id, then unique email, then unique phone", () => {
    assert.equal(matchContactForProposal(rows, { id: "2" }).name, "Sam Ray");
    assert.equal(matchContactForProposal(rows, { email: "pat@example.com" }).id, "1");
    assert.equal(matchContactForProposal(rows, { phone: "(870) 555-0100" }).id, "1");
    assert.equal(matchContactForProposal(rows, { name: "Nobody" }), null);
  });

  it("writes Proposal Sent, the cash amount, and a note — does not invent a number", () => {
    const patch = proposalAttachPatch({
      unitPrice: 4200,
      containerDesc: "40 ft high cube WWT",
      quantity: 1,
      owner: "James",
    });
    assert.equal(patch.status, "Proposal Sent");
    assert.equal(patch.amount, "4200");
    assert.equal(patch.owner, "James");
    assert.match(patch.note, /40 ft high cube WWT/);
    assert.match(patch.note, /proposal \$4200/);
    assert.equal(proposalAttachPatch({ unitPrice: "", containerDesc: "Box" }).amount, "");
  });

  it("sends the open contact id and attaches after a successful write", () => {
    assert.match(page, /contactId: selected && selected.id/);
    assert.match(index, /attachProposalToCrm/);
    assert.match(page, /proposal amount and Proposal Sent stage/);
  });
});
