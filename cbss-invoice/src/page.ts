export function pageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0f1c2e" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CBSS Invoicing</title>
  <style>
    :root {
      --navy: #0f1c2e;
      --accent: #1F4E79;
      --paper: #e8eef4;
      --card: #fff;
      --line: #d0d7de;
      --muted: #5b6b7c;
      --ink: #1a1a1a;
      --ok: #e8f5ee;
      --ok-line: #c8e4d4;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--paper); color: var(--ink); font-size: 15px; }
    header {
      background: var(--navy); color: #fff; padding: 10px 18px;
      display: flex; justify-content: space-between; gap: 12px; align-items: center;
    }
    header .brand { font-weight: 700; letter-spacing: .02em; }
    header .sub { color: #B8C4D0; font-size: 12px; font-weight: 500; }
    header .who { font-size: 13px; color: #d5deea; }
    header .right { display: flex; align-items: center; gap: 10px; }
    main { max-width: 820px; margin: 0 auto; padding: 16px 14px 28px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; }
    h1 { font-size: 20px; margin: 0 0 6px; color: var(--accent); }
    h2 { font-size: 16px; margin: 0 0 10px; color: var(--navy); }
    h3 { font-size: 14px; margin: 16px 0 4px; color: var(--navy); }
    p { line-height: 1.4; }
    .muted { color: var(--muted); font-size: 13px; margin: 0 0 10px; }
    label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 5px; color: #3d4d5c; }
    input, textarea, select {
      width: 100%; border: 1px solid var(--line); border-radius: 7px; padding: 10px 11px;
      font: 15px/1.4 inherit; color: var(--ink); background: #fff;
    }
    button { font: 650 14px inherit; border: 0; border-radius: 7px; padding: 10px 14px; background: var(--accent); color: #fff; cursor: pointer; touch-action: manipulation; }
    button.secondary { background: #fff; color: var(--accent); border: 1px solid var(--line); }
    button:disabled { opacity: .55; cursor: default; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    .err { color: #8A1F1F; font-size: 13px; min-height: 1.1em; margin: 8px 0 0; }
    .hide { display: none !important; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .split3 { display: grid; grid-template-columns: 2fr 90px 1fr; gap: 10px; }
    .check { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; font-size: 14px; font-weight: 600; color: #3d4d5c; }
    .check input { width: auto; margin: 0; }
    input:disabled { background: #f3f6f8; color: #5b6b7c; }
    .outbox { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; background: #f7fafc; border: 1px dashed var(--line); border-radius: 8px; padding: 11px; min-height: 5em; font-size: 14px; }
    @media (max-width: 640px) {
      .split, .split3 { grid-template-columns: 1fr; }
      header { flex-wrap: wrap; padding: 10px 12px; padding-top: max(10px, env(safe-area-inset-top)); }
      header .right { width: 100%; justify-content: space-between; }
      main { padding: 12px 12px max(24px, env(safe-area-inset-bottom)); }
      .card { padding: 14px; }
      input, textarea, select { font-size: 16px; min-height: 44px; }
      textarea { min-height: 88px; }
      button { min-height: 44px; }
      .row { flex-direction: column; align-items: stretch; }
      .row button { width: 100%; }
      footer { font-size: 12px; }
    }
    .hits { border: 1px solid var(--line); border-radius: 8px; margin-top: 10px; }
    .hit { padding: 10px 11px; border-bottom: 1px solid var(--line); }
    .hit:last-child { border-bottom: 0; }
    .hit strong { display: block; }
    .hit a { color: var(--accent); word-break: break-all; }
    footer { margin-top: 14px; color: var(--muted); font-size: 11px; }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="brand">CBSS Invoicing</div>
      <div class="sub" id="stamp">build 4 · WAAVE</div>
    </div>
    <div class="right">
      <div class="who hide" id="who"></div>
      <button type="button" class="secondary hide" id="out">Sign out</button>
    </div>
  </header>
  <main>
    <section id="login" class="card">
      <h1>Sign in</h1>
      <p class="muted">Same company email and password as the CRM.</p>
      <form id="login-form">
        <label for="email">Company email</label>
        <input id="email" name="email" type="email" autocomplete="username" placeholder="you@cbshippingsolutions.com" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <div class="row"><button type="submit">Open invoicing</button></div>
        <p class="err" id="login-err"></p>
      </form>
    </section>

    <section id="desk" class="hide">
      <div class="card">
        <h2>Create a WAAVE invoice</h2>
        <p class="muted">Use this tool for money in. The amount is the number from the proposal after the customer agreed — do not change it. Type the billing address and the delivery address. WAAVE makes the pay link. Open Gmail to send it — that draft CCs Christopher, Aliyah, and you.</p>
        <p class="err hide" id="waave-warn">WAAVE is not connected yet. Christopher: in the WAAVE merchant dashboard copy the public/access key, secret key, and venue id, then add WAAVE_API_KEY, WAAVE_API_SECRET, and WAAVE_VENUE_ID on this Worker.</p>
        <form id="inv-form">
          <div class="split">
            <div><label for="name">Customer name</label><input id="name" required placeholder="First Last" /></div>
            <div><label for="pay-email">Customer email</label><input id="pay-email" type="email" required /></div>
            <div><label for="phone">Phone</label><input id="phone" inputmode="tel" required placeholder="8703232593" /></div>
            <div><label for="amount">Amount USD</label><input id="amount" inputmode="decimal" autocomplete="off" required placeholder="Agreed proposal cash" /></div>
          </div>
          <h3>Billing address</h3>
          <label for="bill-street">Street</label>
          <input id="bill-street" required autocomplete="billing street-address" placeholder="123 Main St" />
          <div class="split3">
            <div><label for="bill-city">City</label><input id="bill-city" required autocomplete="billing address-level2" /></div>
            <div><label for="bill-state">State</label><input id="bill-state" maxlength="2" required autocomplete="billing address-level1" placeholder="AR" /></div>
            <div><label for="bill-zip">ZIP</label><input id="bill-zip" inputmode="numeric" maxlength="10" required autocomplete="billing postal-code" placeholder="72201" /></div>
          </div>
          <label class="check"><input id="same-addr" type="checkbox" /> Delivery is the same as billing</label>
          <h3>Delivery address</h3>
          <label for="del-street">Street</label>
          <input id="del-street" required autocomplete="shipping street-address" placeholder="Job site or drop yard" />
          <div class="split3">
            <div><label for="del-city">City</label><input id="del-city" required autocomplete="shipping address-level2" /></div>
            <div><label for="del-state">State</label><input id="del-state" maxlength="2" required autocomplete="shipping address-level1" placeholder="AR" /></div>
            <div><label for="del-zip">ZIP</label><input id="del-zip" inputmode="numeric" maxlength="10" required autocomplete="shipping postal-code" placeholder="72201" /></div>
          </div>
          <label for="notes">What this invoice is for</label>
          <textarea id="notes" rows="3" required placeholder="40HC CW delivered — paid before the truck"></textarea>
          <div class="row">
            <button type="button" class="secondary" id="lookup-amount">Use last agreed proposal amount</button>
            <button type="submit">Create WAAVE invoice</button>
            <button type="button" class="secondary" id="copy-card">Copy card</button>
            <button type="button" class="secondary" id="open-gmail">Open Gmail</button>
          </div>
          <p class="err" id="inv-err"></p>
        </form>
        <div class="outbox" id="card">The invoice card lands here.</div>
      </div>
      <div class="card" style="margin-top:12px">
        <h2>Recent WAAVE invoices</h2>
        <p class="muted">Refresh to see sent, paid, or canceled. Cancel only if they have not paid.</p>
        <div class="row"><button type="button" class="secondary" id="refresh">Refresh</button></div>
        <div class="hits" id="list"></div>
        <p class="err" id="list-err"></p>
      </div>
      <footer>CBGC LLC DBA CBShippingSolutions · WAAVE API</footer>
    </section>
  </main>
  <script>
    const login = document.getElementById("login");
    const desk = document.getElementById("desk");
    const outBtn = document.getElementById("out");
    const who = document.getElementById("who");
    let lastGmail = "";

    function show(view) {
      login.classList.toggle("hide", view !== "login");
      desk.classList.toggle("hide", view !== "desk");
      outBtn.classList.toggle("hide", view !== "desk");
      who.classList.toggle("hide", view !== "desk");
    }
    function greet(name) { who.textContent = name || "Rep"; }
    function waaveBanner(ready) {
      document.getElementById("waave-warn").classList.toggle("hide", Boolean(ready));
    }
    function val(id) { return document.getElementById(id).value; }
    function copyBillingToDelivery() {
      document.getElementById("del-street").value = val("bill-street");
      document.getElementById("del-city").value = val("bill-city");
      document.getElementById("del-state").value = val("bill-state");
      document.getElementById("del-zip").value = val("bill-zip");
    }
    function syncSameAddr() {
      const same = document.getElementById("same-addr").checked;
      ["del-street", "del-city", "del-state", "del-zip"].forEach((id) => {
        document.getElementById(id).disabled = same;
        document.getElementById(id).required = !same;
      });
      if (same) copyBillingToDelivery();
    }
    document.getElementById("same-addr").addEventListener("change", syncSameAddr);
    ["bill-street", "bill-city", "bill-state", "bill-zip"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => {
        if (document.getElementById("same-addr").checked) copyBillingToDelivery();
      });
    });

    async function boot() {
      const r = await fetch("/session", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (j.ok && j.user) { greet(j.user.name); waaveBanner(j.waave); show("desk"); refresh(); return; }
      show("login");
    }

    document.getElementById("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("login-err");
      err.textContent = "";
      const r = await fetch("/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { err.textContent = j.error || "Could not sign in."; return; }
      greet(j.user && j.user.name);
      waaveBanner(j.waave);
      show("desk");
      refresh();
    });
    outBtn.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      show("login");
    });

    document.getElementById("lookup-amount").addEventListener("click", async () => {
      const err = document.getElementById("inv-err");
      err.textContent = "Looking up the last agreed proposal amount…";
      const r = await fetch("/invoice/lookup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("pay-email").value,
          phone: document.getElementById("phone").value,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok || !j.ok || !j.amount) {
        err.textContent = j.error || "No agreed cash number in CRM. Type the number Christopher set.";
        return;
      }
      document.getElementById("amount").value = String(j.amount);
      if (j.name && !document.getElementById("name").value) document.getElementById("name").value = j.name;
      err.textContent = "Filled from CRM " + (j.source || "proposal") + ". Do not change it unless Christopher says.";
    });

    document.getElementById("inv-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("inv-err");
      const box = document.getElementById("card");
      err.textContent = "";
      lastGmail = "";
      box.textContent = "Creating WAAVE invoice…";
      const r = await fetch("/invoice/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("pay-email").value,
          phone: document.getElementById("phone").value,
          amountRaw: document.getElementById("amount").value,
          notes: document.getElementById("notes").value,
          billingStreet: val("bill-street"),
          billingCity: val("bill-city"),
          billingState: val("bill-state"),
          billingZip: val("bill-zip"),
          deliveryStreet: val("del-street"),
          deliveryCity: val("del-city"),
          deliveryState: val("del-state"),
          deliveryZip: val("del-zip"),
          sameAsBilling: document.getElementById("same-addr").checked,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok || !j.ok) { err.textContent = j.error || "Could not create that invoice."; box.textContent = "The invoice card lands here."; return; }
      box.textContent = j.cardText || "";
      lastGmail = (j.card && j.card.gmailLink) || "";
      refresh();
    });

    document.getElementById("copy-card").addEventListener("click", async () => {
      const text = document.getElementById("card").textContent || "";
      const btn = document.getElementById("copy-card");
      if (!text || text === "The invoice card lands here.") return;
      try { await navigator.clipboard.writeText(text); } catch {}
      const prev = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = prev || "Copy card"; }, 1500);
    });
    document.getElementById("open-gmail").addEventListener("click", () => {
      if (!lastGmail) {
        document.getElementById("inv-err").textContent = "Create an invoice first so there is a pay link to send.";
        return;
      }
      window.open(lastGmail, "_blank", "noopener");
    });

    async function refresh() {
      const err = document.getElementById("list-err");
      const list = document.getElementById("list");
      err.textContent = "";
      const r = await fetch("/invoice/list", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok || !j.ok) { err.textContent = j.error || "Could not load invoices."; return; }
      const rows = j.cards || [];
      if (!rows.length) { list.innerHTML = "<div class=\\"hit\\">No WAAVE invoices yet.</div>"; return; }
      list.innerHTML = rows.map((c) => {
        const link = c.payLink ? "<div><a href=\\"" + c.payLink + "\\" target=\\"_blank\\" rel=\\"noopener\\">Open pay link</a></div>" : "";
        const gmail = c.gmailLink ? "<div><a href=\\"" + c.gmailLink + "\\" target=\\"_blank\\" rel=\\"noopener\\">Open Gmail</a></div>" : "";
        const cancel = /sent|pending|created|open/i.test(c.status || "") && c.id
          ? "<div class=\\"row\\"><button type=\\"button\\" class=\\"secondary\\" data-cancel=\\"" + c.id + "\\">Cancel</button></div>"
          : "";
        const cc = Array.isArray(c.ccEmails) && c.ccEmails.length ? "<div>CC " + c.ccEmails.join(", ") + "</div>" : "";
        const bill = c.billing && (c.billing.street || c.billing.city) ? "<div>Billing: " + [c.billing.street, c.billing.city, [c.billing.state, c.billing.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") + "</div>" : "";
        const del = c.delivery && (c.delivery.street || c.delivery.city) ? "<div>Delivery: " + [c.delivery.street, c.delivery.city, [c.delivery.state, c.delivery.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") + "</div>" : "";
        return "<div class=\\"hit\\"><strong>" + (c.name || "Customer") + " · $" + Number(c.amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) + " · " + (c.status || "") + "</strong><div>" + (c.notes || "") + "</div>" + bill + del + link + gmail + cc + cancel + "</div>";
      }).join("");
    }
    document.getElementById("refresh").addEventListener("click", refresh);
    document.getElementById("list").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (!btn) return;
      const id = btn.getAttribute("data-cancel");
      const r = await fetch("/invoice/cancel", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { document.getElementById("list-err").textContent = j.error || "Could not cancel."; return; }
      refresh();
    });

    boot();
  </script>
</body>
</html>`;
}

export function paidHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CBSS Invoicing</title>
  <style>
    body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #e8eef4; color: #1a1a1a; margin: 0; padding: 32px 16px; }
    .card { max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #d0d7de; border-radius: 10px; padding: 22px; }
    h1 { color: #1F4E79; font-size: 22px; margin: 0 0 10px; }
    p { line-height: 1.45; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Payment received</h1>
    <p>WAAVE has the payment. CBShippingSolutions will follow up on delivery. This page is not a quote.</p>
  </div>
</body>
</html>`;
}
