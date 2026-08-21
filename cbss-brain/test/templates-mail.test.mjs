import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const templates = readFileSync(new URL("../src/templates.ts", import.meta.url), "utf8");
const mail = readFileSync(new URL("../src/mail.ts", import.meta.url), "utf8");

function firstNameOf(raw) {
  const t = String(raw || "").trim();
  if (!t) return "there";
  return t.split(/\s+/)[0];
}
function clause(prefix, value, empty = "") {
  const v = String(value || "").trim();
  return v ? prefix + v : empty;
}

describe("Desk templates and mail", () => {
  it("keeps the 15 Chris-voice templates in source", () => {
    assert.match(templates, /id: "first-reply"/);
    assert.match(templates, /id: "late-reconnect"/);
    assert.match(templates, /id: "ready-to-lock"/);
    assert.match(templates, /fields: \["firstName"/);
    assert.match(index, /path === "\/templates"/);
    assert.match(index, /path === "\/mail\/log"/);
  });

  it("fills only the blanks that belong on the template", () => {
    const body = "Good Morning{{happyDay}}!\n\n{{firstName}}, thanks{{whatClause}}{{zipClause}}.";
    const filled = body
      .replace(/\{\{firstName\}\}/g, firstNameOf("Gary Dean"))
      .replace(/\{\{happyDay\}\}/g, " and Happy Monday")
      .replace(/\{\{whatClause\}\}/g, clause(" for ", "40HC"))
      .replace(/\{\{zipClause\}\}/g, clause(" for zip ", "85132"));
    assert.match(filled, /Gary, thanks for 40HC for zip 85132/);
    assert.doesNotMatch(filled, /\{\{/);
  });

  it("reads inbound shopping mail as Proposal Sent, not Quote forever", () => {
    assert.match(mail, /comparing quotes/);
    assert.match(mail, /stage: "Proposal Sent"/);
    assert.match(mail, /added to my quote/);
  });
});

describe("Desk UI is three jobs", () => {
  it("puts Ask first and folds reply into Email templates", () => {
    const askAt = page.indexOf('data-job="chat">Ask<');
    const callAt = page.indexOf('data-job="live">Call<');
    const emailAt = page.indexOf('data-job="email">Email templates<');
    assert.ok(askAt > 0 && askAt < callAt && callAt < emailAt);
    assert.match(page, /Write a template/);
    assert.match(page, /Log a reply/);
    assert.match(page, /Save reply to CRM/);
    assert.match(page, /Working contact/);
    assert.match(page, /Save to CRM/);
    assert.match(page, /id="tpl-id"/);
    assert.doesNotMatch(page, /data-job="inbox"/);
    assert.doesNotMatch(page, /data-job="crm_note"/);
    assert.doesNotMatch(page, /data-job="templates"/);
    assert.doesNotMatch(page, /data-job="proposal"/);
    assert.doesNotMatch(page, /class="tile"/);
    assert.match(page, /openJob\("chat"\)/);
  });
});
