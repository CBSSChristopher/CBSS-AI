const GV_HOST = "https://voice.google.com/";

function accountFromUrl(url) {
  const m = String(url || "").match(/voice\.google\.com\/u\/(\d+)/i);
  return m ? m[1] : "";
}

function applyAccount(url, account) {
  if (!account) return url;
  return String(url).replace(/voice\.google\.com\/u\/\d+/i, "voice.google.com/u/" + account);
}

async function findVoiceTabs() {
  const tabs = await chrome.tabs.query({ url: ["*://voice.google.com/*"] });
  return (tabs || []).filter((t) => t && t.id && t.url);
}

async function openVoice(url) {
  const tabs = await findVoiceTabs();
  const preferred = tabs.slice().sort((a, b) => Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0))[0];
  const account = preferred ? accountFromUrl(preferred.url) : "";
  const dest = applyAccount(url, account);
  if (preferred) {
    await chrome.tabs.update(preferred.id, { url: dest, active: true });
    if (preferred.windowId) await chrome.windows.update(preferred.windowId, { focused: true });
    return { ok: true, reused: true };
  }
  const created = await chrome.tabs.create({ url: dest, active: true });
  if (created && created.windowId) await chrome.windows.update(created.windowId, { focused: true });
  return { ok: true, reused: false };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "gv-open" || !msg.url) {
    sendResponse({ ok: false });
    return false;
  }
  openVoice(String(msg.url)).then(sendResponse).catch(() => sendResponse({ ok: false }));
  return true;
});
