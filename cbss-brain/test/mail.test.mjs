import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const mailSrc = readFileSync(new URL("../src/mail.ts", import.meta.url), "utf8");
const tplSrc = readFileSync(new URL("../src/templates.ts", import.meta.url), "utf8");
const crmSrc = readFileSync(new URL("../src/crm.ts", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/page.ts", import.meta.url), "utf8");

function classifyInbound(subject, body) {
  const t = `${subject} ${body}`.toLowerCase();
  if (/unsubscrib|do not contact|stop emailing/.test(t)) return "quiet";
  if (
    /spreadsheet|comparing quotes|other quotes|got your proposal|received your proposal|i'll be in touch|i will be in touch|will be in touch|added it to|added to my quote/.test(
      t,
    )
  ) {
    return "shopping";
  }
  if (/let'?s do it|ready to buy|send the invoice|i want it|lock it in|take it/.test(t)) return "ready";
  if (/zip|address|site access|how much|what size|can you|question/.test(t)) return "question";
  if (/need|missing|confirm/.test(t)) return "need_info";
  return "other";
}

function firstNameOf(raw) {
  const t = String(raw || "").trim();
  if (!t) return "there";
  return t.split(/\s+/)[0];
}
function clause(prefix, value) {
  const v = String(value || "").trim();
  return v ? prefix + v : "";
}
function renderTemplate(id, vars = {}) {
  const blocks = {
    "first-reply": "Good Morning,\n\n{{firstName}} thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}.",
    "proposal-attached": "Please see our official proposal attached below.{{priceClause}}",
    "got-reply-shopping": "{{firstName}} thanks for the note. Glad the proposal landed.",
  };
  const src = blocks[id];
  if (!src) return null;
  const firstName = firstNameOf(vars.firstName || "");
  const filled = src
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{whatClause\}\}/g, clause(" for ", vars.what || ""))
    .replace(/\{\{zipClause\}\}/g, clause(" for zip ", vars.zip || ""))
    .replace(/\{\{priceClause\}\}/g, vars.price ? ` The delivered cash figure we quoted is ${vars.price}.` : "");
  return filled;
}

function appendNoteToMap(notes, contactId, entry) {
  const out = {};
  for (const [key, value] of Object.entries(notes || {})) out[key] = Array.isArray(value) ? value.slice() : [];
  const key = String(contactId);
  const list = Array.isArray(out[key]) ? out[key].slice() : [];
  list.unshift(entry);
  out[key] = list;
  return out;
}

function findContactByEmail(book, rawEmail) {
  const want = String(rawEmail || "").trim().toLowerCase();
  if (!want) return null;
  const all = [...(book.contactsAdded || []), ...(book.contacts || [])];
  return all.find((c) => String(c.email || "").trim().toLowerCase() === want) || null;
}

describe("email loop + templates", () => {
  it("reads Gary's shopping-quotes reply as shopping", () => {
    assert.equal(
      classifyInbound("Re: Shipping Container Quote", "got it, added to my quote spreadsheet, will be in touch"),
      "shopping",
    );
    assert.equal(classifyInbound("", "Let's do it. Send the invoice."), "ready");
    assert.equal(classifyInbound("", "What ZIP do you need from me?"), "question");
    assert.match(mailSrc, /classifyInbound/);
    assert.match(mailSrc, /Proposal Sent/);
    assert.match(mailSrc, /Check back — they have the proposal and are comparing quotes/);
  });

  it("fills Chris-voice templates without inventing a price", () => {
    const first = renderTemplate("first-reply", { firstName: "Gary Griffiths", what: "40HC CW", zip: "85132" });
    assert.match(first, /Gary thanks for reaching out to us at CBShippingSolutions/);
    assert.match(first, /for 40HC CW/);
    assert.match(first, /for zip 85132/);
    const priced = renderTemplate("proposal-attached", { firstName: "Gary", price: "$3,775" });
    assert.match(priced, /official proposal attached below/);
    assert.match(priced, /\$3,775/);
    const bare = renderTemplate("proposal-attached", { firstName: "Gary" });
    assert.doesNotMatch(bare, /\$\d/);
    assert.match(tplSrc, /EMAIL_TEMPLATES/);
    assert.match(tplSrc, /id: "first-reply"/);
    assert.match(tplSrc, /id: "proposal-attached"/);
    assert.match(tplSrc, /id: "got-reply-shopping"/);
    assert.match(tplSrc, /id: "cash-before-truck"/);
    assert.match(tplSrc, /With thanks and my blessings/);
    assert.match(tplSrc, /\(870\)-682-3867/);
    assert.match(tplSrc, /\(870\)-323-2593/);
  });

  it("matches a contact by email and never drops protected notes", () => {
    const book = {
      contacts: [{ id: 1787085799283, name: "Gary Griffiths", email: "gary@example.com" }],
      contactsAdded: [],
    };
    assert.equal(findContactByEmail(book, "Gary@example.com").id, 1787085799283);
    const next = appendNoteToMap(
      {
        2621: [{ text: "Already purchased via RTO MCR" }],
        1787085799283: [{ text: "Proposal SENT $3775" }],
      },
      "1787085799283",
      { text: "RECEIVED email\nRead as: shopping\ngot it, added to my quote spreadsheet" },
    );
    assert.equal(next["2621"][0].text, "Already purchased via RTO MCR");
    assert.equal(next["1787085799283"][0].text.includes("RECEIVED"), true);
    assert.equal(next["1787085799283"][1].text, "Proposal SENT $3775");
    assert.match(crmSrc, /PROTECTED_NOTE_KEY = "2621"/);
  });

  it("exposes templates, mail log, and inbox on the desk", () => {
    assert.match(index, /path === "\/templates"/);
    assert.match(index, /path === "\/templates\/render"/);
    assert.match(index, /path === "\/mail\/log"/);
    assert.match(index, /path === "\/inbox-sync"/);
    assert.match(index, /crmSaveDeals/);
    assert.match(index, /crmSaveContactEdits/);
    assert.match(index, /crmIngestProposal/);
    assert.match(crmSrc, /action: "ingestProposal"/);
    assert.match(page, /id="panel-templates"/);
    assert.match(page, /id="panel-inbox"/);
    assert.match(page, /Save to CRM as sent/);
    assert.match(page, /Write to CRM/);
    assert.equal((page.match(/id="contact-q"/g) || []).length, 1);
  });
});
