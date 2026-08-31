import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectionResult,
  crmIngestBody,
  inquiryText,
  officeMail,
  parseInquiry,
  validateInquiry,
} from "../src/request.js";

describe("website information request", () => {
  it("accepts a commercial request and rejects a honeypot", () => {
    const ok = parseInquiry({
      company: "Acme Builders",
      name: "Pat",
      phone: "870-555-0100",
      zip: "72201",
      use: "Jobsite storage",
      quantity: "4",
    });
    assert.equal(validateInquiry(ok), "");
    assert.match(inquiryText(ok, "abc"), /Acme Builders/);
    assert.match(inquiryText(ok, "abc"), /Do not invent a price/);
    assert.match(officeMail(), /cbshippingsolutions\.com/);
    assert.doesNotMatch(officeMail().split("@")[0], /bankschristopher/);

    const spam = parseInquiry({
      company: "Acme",
      name: "Pat",
      phone: "870",
      zip: "72201",
      use: "Jobsite storage",
      company_website: "http://spam.example",
    });
    assert.match(validateInquiry(spam), /Ignore/);
  });

  it("accepts a household request without a company", () => {
    const home = parseInquiry({
      name: "Pat",
      phone: "870-555-0100",
      zip: "72201",
      use: "Residential / farm storage",
    });
    assert.equal(validateInquiry(home), "");
  });

  it("requires name, phone, ZIP, and a listed use", () => {
    const missing = parseInquiry({ phone: "870", zip: "72201", use: "Jobsite storage" });
    assert.match(validateInquiry(missing), /required/);
    const badUse = parseInquiry({
      company: "Acme",
      name: "Pat",
      phone: "870",
      zip: "72201",
      use: "Whatever",
    });
    assert.match(validateInquiry(badUse), /list/);
  });

  it("fails closed only when nothing kept the request", () => {
    assert.equal(collectionResult({ stored: false, emailed: false, crmOk: false }).ok, false);
    assert.equal(collectionResult({ stored: true, emailed: false, crmOk: false }).ok, true);
    assert.equal(collectionResult({ stored: false, emailed: false, crmOk: true }).ok, true);
    const body = crmIngestBody({ name: "Pat", phone: "870", zip: "72201", use: "Jobsite storage" }, "abc");
    assert.equal(body.action, "ingestWebsiteLead");
    assert.equal(body.name, "Pat");
    assert.equal(body.requestId, "abc");
  });
});
