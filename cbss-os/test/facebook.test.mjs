import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isChristopherUser, publicFacebookStatus, readFacebookUpload } from "../src/facebook.ts";
import { pageHtml } from "../src/page.ts";
import { readFileSync } from "node:fs";

const page = pageHtml();
const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

describe("Facebook credential upload", () => {
  it("only Christopher can upload", () => {
    const office = ["christopher", "cbshippingsolutions.com"].join("@");
    const other = ["james", "cbshippingsolutions.com"].join("@");
    assert.equal(isChristopherUser(office, "Christopher Banks"), true);
    assert.equal(isChristopherUser(other, "James"), false);
  });

  it("reads App ID, app secret, and client token without echoing extras", () => {
    const got = readFacebookUpload({
      appId: " 123456 ",
      appSecret: " secret ",
      clientToken: " token ",
    });
    assert.deepEqual(got, { appId: "123456", appSecret: "secret", clientToken: "token" });
    const pub = publicFacebookStatus({ appId: "123456", hasAppSecret: true, hasClientToken: true });
    assert.equal(pub.appId, "123456");
    assert.equal(pub.hasAppSecret, true);
    assert.equal(pub.hasClientToken, true);
    assert.doesNotMatch(JSON.stringify(pub), /secret|token/);
  });

  it("puts the three fields on The Yard CRM Facebook card", () => {
    assert.match(page, /data-crm="facebook"/);
    assert.match(page, /id="fb-app-id"/);
    assert.match(page, /id="fb-app-secret"/);
    assert.match(page, /id="fb-client-token"/);
    assert.match(page, /Save Facebook credentials/);
    assert.match(index, /\/facebook\/status/);
    assert.match(index, /\/facebook\/save/);
    assert.match(index, /saveMetaConfig/);
    assert.match(index, /FACEBOOK_TOKEN_KEY/);
  });
});
