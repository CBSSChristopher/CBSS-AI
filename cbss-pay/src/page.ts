export function pageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CBSS Pay</title>
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
    p { line-height: 1.4; }
    .muted { color: var(--muted); font-size: 13px; margin: 0 0 10px; }
    label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 5px; color: #3d4d5c; }
    input, textarea, select {
      width: 100%; border: 1px solid var(--line); border-radius: 7px; padding: 10px 11px;
      font: 15px/1.4 inherit; color: var(--ink); background: #fff;
    }
    button { font: 650 14px inherit; border: 0; border-radius: 7px; padding: 10px 14px; background: var(--accent); color: #fff; cursor: pointer; }
    button.secondary { background: #fff; color: var(--accent); border: 1px solid var(--line); }
    button:disabled { opacity: .55; cursor: default; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    .err { color: #8A1F1F; font-size: 13px; min-height: 1.1em; margin: 8px 0 0; }
    .hide { display: none !important; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 640px) { .split { grid-template-columns: 1fr; } }
    .outbox { white-space: pre-wrap; background: #f7fafc; border: 1px dashed var(--line); border-radius: 8px; padding: 11px; min-height: 5em; font-size: 14px; }
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
      <div class="brand">CBSS Pay</div>
      <div class="sub" id="stamp">build 3 · Veem</div>
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
        <div class="row"><button type="submit">Open pay</button></div>
        <p class="err" id="login-err"></p>
      </form>
    </section>

    <section id="desk" class="hide">
      <div class="card">
        <h2>Request a Veem payment</h2>
        <p class="muted">Type the amount Christopher set. Veem emails the customer a request and gives you a pay link to copy. This is not a CBSS quote.</p>
        <p class="err hide" id="veem-warn">Veem is not connected yet. Christopher: in apps.veem.com go to Settings → Integrations → Connect Veem API, generate the Client ID and Secret, then add them to this Worker.</p>
        <form id="pay-form">
          <div class="split">
            <div><label for="name">Customer name</label><input id="name" required placeholder="First Last" /></div>
            <div><label for="pay-email">Customer email</label><input id="pay-email" type="email" required /></div>
            <div><label for="phone">Phone</label><input id="phone" inputmode="tel" required placeholder="8703232593" /></div>
            <div><label for="amount">Amount USD</label><input id="amount" inputmode="decimal" required placeholder="3990.00" /></div>
            <div><label for="city">City</label><input id="city" required /></div>
            <div><label for="state">State</label><input id="state" maxlength="2" required placeholder="AR" /></div>
            <div><label for="zip">ZIP</label><input id="zip" inputmode="numeric" maxlength="10" required placeholder="72201" /></div>
            <div><label for="street">Street (optional)</label><input id="street" placeholder="Delivery site" /></div>
          </div>
          <label for="notes">What this is for</label>
          <textarea id="notes" rows="2" required placeholder="40HC CW delivered — paid before the truck"></textarea>
          <div class="row">
            <button type="submit">Create Veem request</button>
            <button type="button" class="secondary" id="copy-card">Copy card</button>
          </div>
          <p class="err" id="pay-err"></p>
        </form>
        <div class="outbox" id="card">The pay card lands here.</div>
      </div>
      <div class="card" style="margin-top:12px">
        <h2>Recent Veem requests</h2>
        <p class="muted">Refresh to see Sent, Claimed, or Paid. Cancel only if they have not claimed it.</p>
        <div class="row"><button type="button" class="secondary" id="refresh">Refresh</button></div>
        <div class="hits" id="list"></div>
        <p class="err" id="list-err"></p>
      </div>
      <footer>CBGC LLC DBA CBShippingSolutions · Veem API</footer>
    </section>
  </main>
  <script>
    const login = document.getElementById("login");
    const desk = document.getElementById("desk");
    const outBtn = document.getElementById("out");
    const who = document.getElementById("who");

    function show(view) {
      login.classList.toggle("hide", view !== "login");
      desk.classList.toggle("hide", view !== "desk");
      outBtn.classList.toggle("hide", view !== "desk");
      who.classList.toggle("hide", view !== "desk");
    }
    function greet(name) { who.textContent = name || "Rep"; }
    function veemBanner(ready) {
      document.getElementById("veem-warn").classList.toggle("hide", Boolean(ready));
    }

    async function boot() {
      const r = await fetch("/session", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (j.ok && j.user) { greet(j.user.name); veemBanner(j.veem); show("desk"); refresh(); return; }
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
      veemBanner(j.veem);
      show("desk");
      refresh();
    });
    outBtn.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      show("login");
    });

    document.getElementById("pay-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("pay-err");
      const box = document.getElementById("card");
      err.textContent = "";
      box.textContent = "Creating Veem request…";
      const r = await fetch("/pay/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("pay-email").value,
          phone: document.getElementById("phone").value,
          amountRaw: document.getElementById("amount").value,
          notes: document.getElementById("notes").value,
          city: document.getElementById("city").value,
          state: document.getElementById("state").value,
          zip: document.getElementById("zip").value,
          street: document.getElementById("street").value,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok || !j.ok) { err.textContent = j.error || "Could not create that request."; box.textContent = "The pay card lands here."; return; }
      box.textContent = j.cardText || "";
      refresh();
    });

    document.getElementById("copy-card").addEventListener("click", async () => {
      const text = document.getElementById("card").textContent || "";
      if (!text || text === "The pay card lands here.") return;
      try { await navigator.clipboard.writeText(text); } catch {}
    });

    async function refresh() {
      const err = document.getElementById("list-err");
      const list = document.getElementById("list");
      err.textContent = "";
      const r = await fetch("/pay/list", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok || !j.ok) { err.textContent = j.error || "Could not load invoices."; return; }
      const rows = j.cards || [];
      if (!rows.length) { list.innerHTML = "<div class=\\"hit\\">No Veem requests yet.</div>"; return; }
      list.innerHTML = rows.map((c) => {
        const link = c.claimLink ? "<div><a href=\\"" + c.claimLink + "\\" target=\\"_blank\\" rel=\\"noopener\\">Open pay link</a></div>" : "";
        const cancel = c.status === "Sent" && c.id
          ? "<div class=\\"row\\"><button type=\\"button\\" class=\\"secondary\\" data-cancel=\\"" + c.id + "\\">Cancel</button></div>"
          : "";
        return "<div class=\\"hit\\"><strong>" + (c.name || "Customer") + " · $" + Number(c.amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) + " · " + (c.status || "") + "</strong><div>" + (c.notes || "") + "</div>" + link + cancel + "</div>";
      }).join("");
    }
    document.getElementById("refresh").addEventListener("click", refresh);
    document.getElementById("list").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (!btn) return;
      const id = btn.getAttribute("data-cancel");
      const r = await fetch("/pay/cancel", {
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
