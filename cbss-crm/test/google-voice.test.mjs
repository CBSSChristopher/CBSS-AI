import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../extensions/cbss-google-voice/manifest.json", import.meta.url), "utf8"));
const background = readFileSync(new URL("../extensions/cbss-google-voice/background.js", import.meta.url), "utf8");
const content = readFileSync(new URL("../extensions/cbss-google-voice/content.js", import.meta.url), "utf8");

test("Google Voice helper finds an existing Voice tab instead of opening one per contact", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "CBSS Google Voice");
  assert.deepEqual(manifest.permissions, ["tabs"]);
  assert.ok(manifest.host_permissions.includes("https://voice.google.com/*"));
  assert.match(JSON.stringify(manifest.content_scripts), /cbsscrm\.cbss\.workers\.dev/);
  assert.match(background, /chrome\.tabs\.query/);
  assert.match(background, /voice\.google\.com\/\*/);
  assert.match(background, /chrome\.tabs\.update/);
  assert.match(content, /source !== "cbss-crm"/);
  assert.match(content, /cbss-gv-helper/);
  assert.equal(existsSync(new URL("../public/gv-helper.zip", import.meta.url)), true);
  assert.equal(existsSync(new URL("../public/gv-helper/manifest.json", import.meta.url)), true);
});

test("CRM Call and Text build official Google Voice URLs and reuse one window name", () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.match(html, /function e164Digits\(/);
  assert.match(html, /function googleVoiceUrl\(/);
  const e164 = script.match(/function e164Digits\(phone\) \{[\s\S]*?\n    \}/)[0];
  const urlFn = script.match(/function googleVoiceUrl\(kind, phone\) \{[\s\S]*?\n    \}/)[0];
  const slotFn = `function gvAccountSlot(){ return '0'; }`;
  const builders = new Function(e164 + ";" + slotFn + ";" + urlFn + "; return { e164Digits, googleVoiceUrl };")();
  assert.equal(builders.e164Digits("618-484-8859"), "16184848859");
  assert.equal(builders.e164Digits("1 (618) 484-8859"), "16184848859");
  assert.equal(builders.googleVoiceUrl("call", "6184848859"), "https://voice.google.com/u/0/calls?a=nc,%2B16184848859");
  assert.equal(builders.googleVoiceUrl("text", "6184848859"), "https://voice.google.com/u/0/messages?itemId=t.%2B16184848859");
  assert.equal(builders.googleVoiceUrl("call", "x"), "");
});

test("helper zip contains the unpacked extension files", () => {
  const zip = spawnSync("unzip", ["-l", new URL("../public/gv-helper.zip", import.meta.url).pathname], { encoding: "utf8" });
  assert.equal(zip.status, 0, zip.stderr);
  assert.match(zip.stdout, /manifest\.json/);
  assert.match(zip.stdout, /background\.js/);
  assert.match(zip.stdout, /content\.js/);
});
