import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildDeskAddedContact,
  deskContactName,
  deskContactNote,
  findOwnDeskContact,
  phoneDigits,
  readDeskContactDraft,
  scheduleDeskTrack,
} from "../src/desk-contact.ts";
import { pageHtml } from "../src/page.ts";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("Desk new contact on The Yard", () => {
  it("builds first and last name plus address fields", () => {
    const draft = readDeskContactDraft({
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "(870) 555-0100",
      company: "Lee Farms",
      city: "Jonesboro",
      state: "AR",
      zip: "72401",
      address: "14 Depot Rd",
      notes: "Called about a 40HC. Do not invent a price.",
    });
    assert.equal(deskContactName(draft), "Pat Lee");
    assert.equal(draft.street, "14 Depot Rd");
    assert.equal(draft.company, "Lee Farms");
    const row = buildDeskAddedContact(draft, "kyle@cbshippingsolutions.com", new Date("2026-09-01T12:00:00Z"));
    assert.equal(row.name, "Pat Lee");
    assert.equal(row.owner, "Kyle Hodgkiss");
    assert.equal(row.status, "CTE in progress");
    assert.equal(row.source, "Desk");
    assert.equal(row.street, "14 Depot Rd");
    assert.equal(row.created, "2026-09-01");
  });

  it("reuses the signed-in rep's matching phone and not someone else's", () => {
    const draft = readDeskContactDraft({ firstName: "Pat", lastName: "Lee", phone: "8705550100" });
    const mine = { id: 1, name: "Pat Lee", phone: "870-555-0100", owner: "Kyle" };
    const other = { id: 2, name: "Pat Lee", phone: "870-555-0100", owner: "James" };
    assert.equal(phoneDigits("870-555-0100"), "8705550100");
    assert.equal(findOwnDeskContact([other], draft, "Kyle Hodgkiss"), null);
    assert.equal(findOwnDeskContact([other, mine], draft, "Kyle Hodgkiss"), mine);
  });

  it("books CTE or one follow-up from the same two buttons as Desk", () => {
    const cte = scheduleDeskTrack({ track: "cte", nextAction: "", followUpDate: "" }, new Date("2026-09-01T15:00:00Z"));
    assert.equal(cte.track, "cte");
    assert.equal(cte.stage, "CTE in progress");
    assert.match(cte.noteSuffix, /CTE plan/);
    const follow = scheduleDeskTrack(
      { track: "followup", nextAction: "Call about site access", followUpDate: "2026-09-03T09:00" },
      new Date("2026-09-01T15:00:00Z"),
    );
    assert.equal(follow.stage, "Follow up in progress");
    assert.equal(follow.nextAction, "Call about site access");
    assert.equal(follow.followUpDate, "2026-09-03T09:00");
    assert.doesNotMatch(follow.noteSuffix, /CTE plan/);
    const draft = readDeskContactDraft({ firstName: "Pat", lastName: "Lee", pastCte: true });
    assert.equal(draft.track, "followup");
    assert.match(deskContactNote("Need a 40HC.", follow), /Need a 40HC/);
    assert.match(deskContactNote("Need a 40HC.", follow), /Follow-up set/);
  });

  it("puts the New contact form on Desk and writes through /desk/contact", () => {
    assert.match(page, />New contact</);
    assert.match(page, /id="desk-new-open"/);
    assert.match(page, /id="desk-new"/);
    assert.match(page, /id="n-first"/);
    assert.match(page, /id="n-last"/);
    assert.match(page, /id="n-email"/);
    assert.match(page, /id="n-phone"/);
    assert.match(page, /id="n-company"/);
    assert.match(page, /id="n-street"/);
    assert.match(page, /id="n-city"/);
    assert.match(page, /id="n-state"/);
    assert.match(page, /id="n-zip"/);
    assert.match(page, /id="n-notes"/);
    assert.match(page, /id="n-track"/);
    assert.match(page, /data-track="cte"/);
    assert.match(page, /data-track="followup"/);
    assert.match(page, /Is this CTE or follow-up\?/);
    assert.match(page, /id="n-action"/);
    assert.match(page, /id="n-when"/);
    assert.match(page, /id="n-save"/);
    assert.match(page, /Save to CRM/);
    assert.match(page, /id="n-ok"/);
    assert.match(page, /id="n-saved"/);
    assert.match(page, /role="alertdialog"/);
    assert.match(page, /showNewContactSaved/);
    assert.match(page, /is in the CRM/);
    assert.match(page, /Got it/);
    assert.doesNotMatch(page, /\$\("n-err"\)\.className = "ok"/);
    assert.match(page, /api\("\/desk\/contact"/);
    assert.match(index, /path === "\/desk\/contact"/);
    assert.match(index, /saveContactsAdded/);
    assert.match(index, /saveFollowups/);
    assert.match(index, /scheduleDeskTrack/);
    assert.match(index, /appendNote/);
    assert.match(index, /Type first and last name/);
  });
});
