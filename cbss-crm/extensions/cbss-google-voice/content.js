(function () {
  const ORIGIN = window.location.origin;
  try {
    window.postMessage({ source: "cbss-gv-helper", reply: "ready" }, ORIGIN);
  } catch (_) {}

  window.addEventListener("message", function (ev) {
    if (ev.source !== window || ev.origin !== ORIGIN) return;
    const data = ev.data;
    if (!data || data.source !== "cbss-crm" || data.type !== "gv-open") return;
    chrome.runtime.sendMessage(
      { type: "gv-open", kind: data.kind, digits: data.digits, url: data.url },
      function (res) {
        window.postMessage(
          { source: "cbss-gv-helper", reply: "open", ok: !!(res && res.ok), reused: !!(res && res.reused) },
          ORIGIN
        );
      }
    );
  });
})();
