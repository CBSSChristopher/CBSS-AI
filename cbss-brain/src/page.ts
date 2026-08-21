export function pageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CBSS Desk</title>
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
    .tabs { display: flex; gap: 4px; margin: 12px 0 0; padding: 0; }
    .tabs button {
      flex: 1; background: #f4f7fa; color: var(--muted); border: 1px solid transparent; padding: 9px 8px;
    }
    .tabs button.on { background: #fff; color: var(--accent); border-color: var(--line); box-shadow: 0 1px 0 #fff; }
    .contact-bar { margin-top: 12px; }
    .sel { background: var(--ok); border: 1px solid var(--ok-line); border-radius: 8px; padding: 9px 11px; margin-top: 8px; font-size: 14px; }
    .hits { border: 1px solid var(--line); border-radius: 8px; max-height: 200px; overflow: auto; margin-top: 6px; }
    .hit { display: block; width: 100%; text-align: left; padding: 9px 11px; border: 0; border-bottom: 1px solid var(--line); background: #fff; color: var(--ink); cursor: pointer; font-weight: 500; }
    .hit:last-child { border-bottom: 0; }
    .hit:hover, .hit.on { background: #e8f0f7; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 640px) { .split { grid-template-columns: 1fr; } .tabs button { font-size: 13px; padding: 9px 4px; } }
    .choice { display: flex; gap: 16px; flex-wrap: wrap; margin: 4px 0 2px; }
    .choice label { font-weight: 500; display: flex; gap: 6px; align-items: center; margin: 0; font-size: 14px; }
    .log { display: flex; flex-direction: column; gap: 8px; min-height: 24vh; margin: 8px 0 12px; }
    .bubble { max-width: 92%; padding: 9px 11px; border-radius: 10px; line-height: 1.4; white-space: pre-wrap; }
    .me { align-self: flex-end; background: #e8f0f7; }
    .bot { align-self: flex-start; background: var(--ok); border: 1px solid var(--ok-line); }
    #composer { display: flex; gap: 8px; align-items: flex-end; }
    #composer textarea { min-height: 48px; resize: vertical; }
    .outbox { white-space: pre-wrap; background: #f7fafc; border: 1px dashed var(--line); border-radius: 8px; padding: 11px; min-height: 5em; font-size: 14px; }
    .more { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 10px; }
    .more summary { cursor: pointer; color: var(--accent); font-weight: 650; font-size: 13px; }
    .field-wrap.hide { display: none !important; }
    footer { margin-top: 14px; color: var(--muted); font-size: 11px; }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="brand">CBSS Desk</div>
      <div class="sub" id="stamp">build 2</div>
    </div>
    <div class="who hide" id="who"></div>
    <button type="button" class="secondary hide" id="out">Sign out</button>
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
        <div class="row"><button type="submit">Open desk</button></div>
        <p class="err" id="login-err"></p>
      </form>
    </section>

    <section id="desk" class="hide">
      <div class="card">
        <div class="tabs" role="tablist">
          <button type="button" class="on" data-job="live">Call</button>
          <button type="button" data-job="email">Email</button>
          <button type="button" data-job="inbox">Inbox</button>
          <button type="button" data-job="chat">Ask</button>
        </div>
        <div class="contact-bar">
          <label for="contact-q">Working contact</label>
          <input id="contact-q" placeholder="Name, phone, email, ZIP" />
          <div id="contact-hits" class="hits hide"></div>
          <div id="contact-sel" class="sel hide"></div>
          <div class="row">
            <button type="button" class="secondary" id="new-toggle">New contact</button>
            <button type="button" class="secondary" id="contact-clear">Clear</button>
          </div>
          <div id="new-box" class="hide">
            <div class="split">
              <div><label>Name</label><input id="new-name" /></div>
              <div><label>Phone</label><input id="new-phone" /></div>
              <div><label>Email</label><input id="new-email" /></div>
              <div><label>City</label><input id="new-city" /></div>
              <div><label>State</label><input id="new-state" /></div>
              <div><label>ZIP</label><input id="new-zip" /></div>
            </div>
          </div>
        </div>
      </div>

      <div id="panel-live" class="card" style="margin-top:12px">
        <h2>Call</h2>
        <p class="muted">Dump scraps. The desk writes the CRM note and books CTE or one follow-up.</p>
        <label for="scraps">Call scraps</label>
        <textarea id="scraps" rows="6" placeholder="What they said, ZIP, size, site, next step…"></textarea>
        <div class="choice">
          <label><input type="radio" name="cte" value="cte" checked /> Still in CTE</label>
          <label><input type="radio" name="cte" value="past" /> Past CTE — they connected</label>
        </div>
        <div class="split">
          <div><label>Next action</label><input id="next-action" placeholder="Optional" /></div>
          <div><label>Follow-up time</label><input id="follow-when" type="datetime-local" /></div>
        </div>
        <div class="row"><button type="button" id="call-save">Save to CRM</button></div>
        <p class="err" id="err-live"></p>
        <div class="outbox" id="out-live"></div>
      </div>

      <div id="panel-email" class="card hide" style="margin-top:12px">
        <h2>Email</h2>
        <p class="muted">Chris-voice templates. Copy, send from Gmail, then save to the CRM.</p>
        <label for="tpl-id">Template</label>
        <select id="tpl-id"></select>
        <p class="muted" id="tpl-when"></p>
        <div class="split">
          <div class="field-wrap" data-need="firstName"><label>First name</label><input id="tpl-first" /></div>
          <div class="field-wrap" data-need="zip"><label>ZIP</label><input id="tpl-zip" /></div>
        </div>
        <div class="field-wrap" data-need="what"><label>What they want</label><input id="tpl-what" placeholder="40HC wind and water tight" /></div>
        <div class="split">
          <div class="field-wrap" data-need="day"><label>Day</label><input id="tpl-day" placeholder="Monday" /></div>
          <div class="field-wrap" data-need="note"><label>After-call note</label><input id="tpl-note" placeholder="delivering once your property closes" /></div>
        </div>
        <div class="field-wrap" data-need="price"><label>Delivered cash already quoted</label><input id="tpl-price" placeholder="Leave blank unless a number is already on the table" /></div>
        <div class="field-wrap" data-need="site"><label>Site notes</label><input id="tpl-site" /></div>
        <div class="row">
          <button type="button" id="tpl-render">Fill</button>
          <button type="button" class="secondary" id="tpl-copy">Copy</button>
          <button type="button" class="secondary" id="tpl-gmail">Open Gmail</button>
          <button type="button" id="tpl-log">Save sent to CRM</button>
        </div>
        <label>Subject</label>
        <input id="tpl-subject" />
        <label>Body</label>
        <textarea id="tpl-body" rows="10"></textarea>
        <p class="err" id="err-email"></p>
        <div class="outbox" id="out-email"></div>
        <details class="more">
          <summary>Custom draft or proposal wording</summary>
          <p class="muted">Only if a template does not fit. Price only if Christopher already set one.</p>
          <label>Facts for a custom draft</label>
          <textarea id="custom-facts" rows="3" placeholder="First name, what they asked for, ZIP, proposal attached yes/no…"></textarea>
          <div class="row">
            <button type="button" data-run="email">Write email</button>
            <button type="button" data-run="proposal">Write proposal copy</button>
            <button type="button" class="secondary" data-copy="custom">Copy</button>
            <button type="button" id="custom-log">Save sent to CRM</button>
          </div>
          <p class="err" id="err-custom"></p>
          <div class="outbox" id="out-custom"></div>
        </details>
      </div>

      <div id="panel-inbox" class="card hide" style="margin-top:12px">
        <h2>Inbox</h2>
        <p class="muted">Paste a customer reply. The desk matches the lead and books the next step.</p>
        <label>Their email</label>
        <input id="in-from" placeholder="customer@email.com" />
        <label>Subject</label>
        <input id="in-subject" />
        <label>Their message</label>
        <textarea id="in-body" rows="8" placeholder="Paste the reply"></textarea>
        <div class="row"><button type="button" id="in-log">Write to CRM</button></div>
        <p class="err" id="err-inbox"></p>
        <div class="outbox" id="out-inbox"></div>
      </div>

      <div id="panel-chat" class="card hide" style="margin-top:12px">
        <h2>Ask</h2>
        <p class="muted">Talk through a lead, a call, or a messy note.</p>
        <div class="log" id="log"></div>
        <form id="ask">
          <div id="composer">
            <textarea id="q" rows="2" placeholder="What do you need?" required></textarea>
            <button type="submit">Ask</button>
          </div>
          <p class="err" id="chat-err"></p>
        </form>
      </div>
      <footer>CBGC LLC DBA CBShippingSolutions · Desk build 2</footer>
    </section>
  </main>
  <script>
    const login = document.getElementById("login");
    const desk = document.getElementById("desk");
    const outBtn = document.getElementById("out");
    const who = document.getElementById("who");
    const log = document.getElementById("log");
    const history = [];
    const panels = ["live", "email", "inbox", "chat"];
    let picked = null;
    let searchTimer = 0;
    let templateList = [];

    function show(view) {
      login.classList.toggle("hide", view !== "login");
      desk.classList.toggle("hide", view !== "desk");
      outBtn.classList.toggle("hide", view !== "desk");
      who.classList.toggle("hide", view !== "desk");
    }
    function greet(name) {
      who.textContent = name || "Rep";
    }
    function openJob(job) {
      panels.forEach((id) => {
        document.getElementById("panel-" + id).classList.toggle("hide", id !== job);
      });
      document.querySelectorAll(".tabs button").forEach((b) => {
        b.classList.toggle("on", b.getAttribute("data-job") === job);
      });
    }
    function bubble(role, text) {
      const d = document.createElement("div");
      d.className = "bubble " + (role === "user" ? "me" : "bot");
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }
    function firstNameOf(name) {
      const t = String(name || "").trim();
      return t ? t.split(/\\s+/)[0] : "";
    }
    function applyPickedFields() {
      if (!picked) return;
      const first = firstNameOf(picked.name);
      const zip = picked.zip || "";
      const set = (id, val) => { const el = document.getElementById(id); if (el && !el.value) el.value = val || ""; };
      set("tpl-first", first);
      set("tpl-zip", zip);
      set("in-from", picked.email || "");
      set("new-name", picked.name || "");
    }
    function renderPicked() {
      const box = document.getElementById("contact-sel");
      if (!picked) { box.classList.add("hide"); box.textContent = ""; return; }
      box.classList.remove("hide");
      box.textContent = [picked.name, picked.phone, picked.email, picked.city, picked.stage].filter(Boolean).join(" · ");
      applyPickedFields();
    }
    function gmailDraft(to, body, subject) {
      return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to || "") + "&su=" + encodeURIComponent(subject || "") + "&body=" + encodeURIComponent(body || "");
    }
    function mailResult(j) {
      if (!j || !j.ok) return (j && j.error) || "Could not write the CRM.";
      return [
        "Saved to CRM.",
        j.kind ? ("Read as: " + j.kind) : "",
        j.stage ? ("Stage: " + j.stage) : "",
        j.nextAction ? ("Follow-up: " + j.nextAction + (j.followUpDate ? " @ " + String(j.followUpDate).replace("T", " ") : "")) : "",
        j.note || "",
      ].filter(Boolean).join("\\n");
    }
    async function logMail(payload, errId, outId) {
      const err = document.getElementById(errId);
      const box = document.getElementById(outId);
      err.textContent = "";
      box.textContent = "Saving to the CRM…";
      const r = await fetch("/mail/log", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok) { err.textContent = j.error || "Could not save."; box.textContent = ""; return; }
      box.textContent = mailResult(j);
    }
    function showTemplateFields(fields) {
      const need = new Set(fields || ["firstName"]);
      document.querySelectorAll("[data-need]").forEach((el) => {
        el.classList.toggle("hide", !need.has(el.getAttribute("data-need")));
      });
    }
    function selectTemplate(id) {
      const sel = document.getElementById("tpl-id");
      sel.value = id;
      const t = templateList.find((x) => x.id === id);
      document.getElementById("tpl-when").textContent = t && t.when || "";
      showTemplateFields(t && t.fields);
    }
    function renderTemplateOptions() {
      const sel = document.getElementById("tpl-id");
      sel.innerHTML = "";
      templateList.forEach((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = t.name;
        sel.appendChild(o);
      });
      if (templateList[0]) selectTemplate(templateList[0].id);
    }
    async function loadTemplates() {
      const r = await fetch("/templates", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return;
      templateList = j.templates || [];
      renderTemplateOptions();
    }
    function renderHits(rows) {
      const box = document.getElementById("contact-hits");
      box.innerHTML = "";
      if (!rows || !rows.length) { box.classList.add("hide"); return; }
      box.classList.remove("hide");
      rows.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "hit" + (picked && picked.id === c.id ? " on" : "");
        b.textContent = [c.name || "Unnamed", c.phone, c.city, c.owner].filter(Boolean).join(" · ");
        b.addEventListener("click", () => {
          picked = c;
          document.getElementById("new-box").classList.add("hide");
          renderPicked();
          renderHits(rows);
        });
        box.appendChild(b);
      });
    }
    async function searchContacts(q) {
      const r = await fetch("/contacts?q=" + encodeURIComponent(q || ""), { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok) {
        document.getElementById("err-live").textContent = j.error || "Could not search the CRM.";
        return;
      }
      renderHits(j.contacts || []);
    }
    async function enterDesk(name) {
      greet(name);
      show("desk");
      openJob("live");
      loadTemplates();
    }

    async function boot() {
      const r = await fetch("/session", { credentials: "same-origin" });
      const j = await r.json();
      if (!j.ok) { show("login"); return; }
      enterDesk(j.user && j.user.name);
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
      if (!r.ok) { err.textContent = j.error || "Could not sign in."; return; }
      document.getElementById("password").value = "";
      history.length = 0;
      log.innerHTML = "";
      enterDesk((j.user && j.user.name) || "rep");
    });

    outBtn.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      history.length = 0;
      log.innerHTML = "";
      picked = null;
      show("login");
    });

    document.querySelectorAll(".tabs button").forEach((b) => {
      b.addEventListener("click", () => openJob(b.getAttribute("data-job")));
    });

    async function ask(text) {
      const err = document.getElementById("chat-err");
      err.textContent = "";
      const q = String(text || "").trim();
      if (!q) return;
      bubble("user", q);
      history.push({ role: "user", content: q });
      document.getElementById("q").value = "";
      const r = await fetch("/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok) { err.textContent = j.error || "Try again."; return; }
      history.push({ role: "assistant", content: j.reply || "" });
      bubble("assistant", j.reply || "");
    }

    document.getElementById("ask").addEventListener("submit", (e) => {
      e.preventDefault();
      ask(document.getElementById("q").value);
    });

    document.querySelectorAll("[data-run]").forEach((b) => {
      b.addEventListener("click", async () => {
        const job = b.getAttribute("data-run");
        const err = document.getElementById("err-custom");
        const box = document.getElementById("out-custom");
        err.textContent = "";
        box.textContent = "Writing…";
        const facts = String(document.getElementById("custom-facts").value || "").trim();
        const fields = {};
        if (facts) fields.Facts = facts;
        if (picked) {
          if (picked.name) fields.Name = picked.name;
          if (picked.email) fields.Email = picked.email;
          if (picked.zip) fields.ZIP = picked.zip;
        }
        const r = await fetch("/job", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job, fields }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 401) { show("login"); return; }
        if (!r.ok) { err.textContent = j.error || "Try again."; box.textContent = ""; return; }
        box.textContent = j.reply || "";
      });
    });
    document.querySelectorAll("[data-copy]").forEach((b) => {
      b.addEventListener("click", async () => {
        const text = document.getElementById("out-custom").textContent || "";
        if (!text) return;
        try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; setTimeout(() => b.textContent = "Copy", 1200); } catch (_) {}
      });
    });

    document.getElementById("contact-q").addEventListener("input", (e) => {
      const q = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchContacts(q), 280);
    });
    document.getElementById("new-toggle").addEventListener("click", () => {
      picked = null;
      renderPicked();
      document.getElementById("new-box").classList.toggle("hide");
    });
    document.getElementById("contact-clear").addEventListener("click", () => {
      picked = null;
      document.getElementById("contact-q").value = "";
      document.getElementById("contact-hits").classList.add("hide");
      document.getElementById("new-box").classList.add("hide");
      renderPicked();
    });
    document.getElementById("call-save").addEventListener("click", async () => {
      const err = document.getElementById("err-live");
      const box = document.getElementById("out-live");
      err.textContent = "";
      box.textContent = "Summarizing and saving…";
      const past = document.querySelector('input[name="cte"]:checked');
      const body = {
        scraps: document.getElementById("scraps").value,
        pastCte: !!(past && past.value === "past"),
        nextAction: document.getElementById("next-action").value,
        followUpDate: document.getElementById("follow-when").value,
      };
      if (picked && picked.id) body.contactId = picked.id;
      else {
        const name = document.getElementById("new-name").value.trim();
        if (!name) { err.textContent = "Pick a contact or add a name."; box.textContent = ""; return; }
        body.create = {
          name,
          phone: document.getElementById("new-phone").value,
          email: document.getElementById("new-email").value,
          city: document.getElementById("new-city").value,
          state: document.getElementById("new-state").value,
          zip: document.getElementById("new-zip").value,
        };
      }
      const r = await fetch("/call/save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok) { err.textContent = j.error || "Could not save."; box.textContent = ""; return; }
      if (j.contact) picked = Object.assign({}, picked || {}, j.contact);
      renderPicked();
      const cte = (j.ctePlan || []).map((item) => item.channel.toUpperCase() + " " + String(item.when || "").replace("T", " ") + " — " + item.label).join("\\n");
      box.textContent = [
        j.created ? "Added a new CRM contact." : "Updated the CRM contact.",
        j.summary || "",
        "",
        j.pastCte ? "Past CTE — follow-up booked." : "CTE booked.",
        j.nextAction ? ("Next: " + j.nextAction + " @ " + String(j.followUpDate || "").replace("T", " ")) : "",
        cte,
        "",
        "CRM note:",
        j.note || "",
      ].filter((line, i, arr) => line || (i && arr[i-1])).join("\\n");
    });

    document.getElementById("tpl-id").addEventListener("change", () => selectTemplate(document.getElementById("tpl-id").value));
    document.getElementById("tpl-render").addEventListener("click", async () => {
      const err = document.getElementById("err-email");
      const box = document.getElementById("out-email");
      err.textContent = "";
      box.textContent = "Filling…";
      const r = await fetch("/templates/render", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: document.getElementById("tpl-id").value,
          vars: {
            firstName: document.getElementById("tpl-first").value,
            what: document.getElementById("tpl-what").value,
            zip: document.getElementById("tpl-zip").value,
            price: document.getElementById("tpl-price").value,
            site: document.getElementById("tpl-site").value,
            day: document.getElementById("tpl-day").value,
            note: document.getElementById("tpl-note").value,
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { show("login"); return; }
      if (!r.ok) { err.textContent = j.error || "Could not fill that template."; box.textContent = ""; return; }
      document.getElementById("tpl-subject").value = j.subject || "";
      document.getElementById("tpl-body").value = j.body || "";
      box.textContent = "Filled. Copy, send from Gmail, then save to CRM.";
    });
    document.getElementById("tpl-copy").addEventListener("click", async () => {
      const text = document.getElementById("tpl-body").value || "";
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch (_) {}
    });
    document.getElementById("tpl-gmail").addEventListener("click", () => {
      window.open(gmailDraft(picked && picked.email || "", document.getElementById("tpl-body").value, document.getElementById("tpl-subject").value), "_blank");
    });
    document.getElementById("tpl-log").addEventListener("click", () => {
      const id = document.getElementById("tpl-id").value;
      logMail({
        direction: "sent",
        to: picked && picked.email,
        contactId: picked && picked.id,
        subject: document.getElementById("tpl-subject").value,
        body: document.getElementById("tpl-body").value,
        templateId: id,
        hasProposal: id.indexOf("proposal") === 0 || id === "resend-proposal",
      }, "err-email", "out-email");
    });
    document.getElementById("custom-log").addEventListener("click", () => {
      logMail({
        direction: "sent",
        to: picked && picked.email,
        contactId: picked && picked.id,
        body: document.getElementById("out-custom").textContent || "",
        templateId: "custom-draft",
      }, "err-custom", "out-custom");
    });
    document.getElementById("in-log").addEventListener("click", () => {
      logMail({
        direction: "received",
        from: document.getElementById("in-from").value,
        subject: document.getElementById("in-subject").value,
        body: document.getElementById("in-body").value,
        contactId: picked && picked.id,
      }, "err-inbox", "out-inbox");
    });

    boot();
  </script>
</body>
</html>`;
}
