import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contactChangeNote,
  contactNameChoices,
  formatContactChanges,
  ownerChoices,
} from "../src/contact-log.ts";
import { TEAM_OWNERS } from "../src/brand.ts";

describe("contact change lines", () => {
  it("records name and owner moves in plain lead language", () => {
    const lines = formatContactChanges(
      { name: "Pat Lee", owner: "New/Unassigned", phone: "8705550100", status: "New Lead" },
      { name: "Pat Lee", owner: "James", phone: "8705550100", status: "Contacted" },
    );
    assert.deepEqual(lines, [
      "owner changed from New/Unassigned to James",
      "stage changed from New Lead to Contacted",
    ]);
    assert.match(contactChangeNote("James", lines), /James · owner changed from New\/Unassigned to James/);
    assert.doesNotMatch(contactChangeNote("James", lines), /audit|security|liability/i);
  });

  it("skips fields that did not move", () => {
    assert.deepEqual(
      formatContactChanges({ name: "Pat", email: "a@b.com" }, { name: "Pat", email: "a@b.com" }),
      [],
    );
    assert.equal(contactChangeNote("James", []), "");
  });

  it("builds a name list from the book and keeps the current name", () => {
    assert.deepEqual(contactNameChoices(["Zed", "Ann", "Ann", ""], "Pat"), ["Ann", "Pat", "Zed"]);
  });

  it("keeps owner picks on the team list", () => {
    const list = ownerChoices(TEAM_OWNERS, "James");
    assert.ok(list.includes("James"));
    assert.ok(list.includes("New/Unassigned"));
    assert.ok(list.includes("Christopher Banks"));
    const extra = ownerChoices(TEAM_OWNERS, "Temp Rep");
    assert.equal(extra[0], "Temp Rep");
  });
});
