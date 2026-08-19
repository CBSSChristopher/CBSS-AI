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
      --navy: #141E2E;
      --accent: #1F4F78;
      --green: #0D6B38;
      --paper: #F4F7FA;
      --line: #C5D0DA;
      --muted: #5A6570;
      --white: #fff;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body { font-family: Georgia, "Times New Roman", Times, serif; background: var(--paper); color: var(--navy); }
    header { background: var(--navy); color: var(--white); padding: 16px 20px 14px; display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
    header strong { display: block; font-size: 15px; letter-spacing: .04em; }
    header span { display: block; color: #B8C4D0; font-size: 12px; margin-top: 4px; }
    main { max-width: 880px; margin: 0 auto; padding: 20px 16px 28px; }
    .card { background: var(--white); border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
    h1 { font-size: 22px; margin: 0 0 8px; color: var(--accent); }
    h2 { font-size: 16px; margin: 0 0 8px; }
    p { line-height: 1.45; }
    .muted { color: var(--muted); font-size: 14px; }
    label { display: block; font-size: 13px; font-weight: 700; margin: 12px 0 6px; }
    input, textarea, select {
      width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 12px;
      font: 16px/1.4 Georgia, serif; color: var(--navy); background: #fff;
    }
    button { font: 700 15px Georgia, serif; border: 0; border-radius: 8px; padding: 12px 16px; background: var(--accent); color: #fff; cursor: pointer; }
    button.secondary { background: transparent; color: var(--accent); border: 1px solid var(--line); }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .err { color: #8A1F1F; font-size: 14px; min-height: 1.2em; }
    .hide { display: none !important; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
    .tile { text-align: left; background: #fff; color: var(--navy); border: 1px solid var(--line); padding: 14px; }
    .tile b { display: block; color: var(--accent); margin-bottom: 4px; }
    .tile span { font-weight: 400; font-size: 13px; color: var(--muted); }
    .log { display: flex; flex-direction: column; gap: 10px; min-height: 28vh; margin: 12px 0; }
    .bubble { max-width: 92%; padding: 10px 12px; border-radius: 10px; line-height: 1.45; white-space: pre-wrap; }
    .me { align-self: flex-end; background: #E8F0F7; }
    .bot { align-self: flex-start; background: #E8F5EE; border: 1px solid #C8E4D4; }
    #composer { display: flex; gap: 8px; align-items: flex-end; }
    #composer textarea { min-height: 52px; resize: vertical; }
    .outbox { white-space: pre-wrap; background: #F7FAFC; border: 1px dashed var(--line); border-radius: 8px; padding: 12px; min-height: 8em; }
    .hits { border: 1px solid var(--line); border-radius: 8px; max-height: 220px; overflow: auto; margin-top: 6px; }
    .hit { display: block; width: 100%; text-align: left; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--line); background: #fff; color: var(--navy); cursor: pointer; }
    .hit:last-child { border-bottom: 0; }
    .hit:hover, .hit.on { background: #E8F0F7; }
    .sel { background: #E8F5EE; border: 1px solid #C8E4D4; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
    .choice { display: flex; gap: 14px; flex-wrap: wrap; margin: 8px 0 4px; }
    .choice label { font-weight: 400; display: flex; gap: 6px; align-items: center; margin: 0; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 640px) { .split { grid-template-columns: 1fr; } }
    footer { margin-top: 16px; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div>
      <strong>CB SHIPPING SOLUTIONS</strong>
      <span>Rep desk — writes notes and follow-ups into the CRM</span>
    </div>
    <button type="button" class="secondary hide" id="out">Sign out</button>
  </header>
  <main>
    <section id="login" class="card">
      <h1>CBSS Desk</h1>
      <p class="muted">Log in with the same company email and password you use for the CRM. On a live call, feed it scraps. It summarizes, writes the CRM note, and books CTE or the next follow-up. It does not send customer email. It will not invent a price.</p>
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
        <h1>Your CBSS desk</h1>
        <p class="muted" id="hello">Signed in.</p>
        <div class="grid">
          <button type="button" class="tile" data-job="live"><b>Live call</b><span>Feed scraps. It summarizes, writes the CRM note, and books CTE or the follow-up.</span></button>
          <button type="button" class="tile" data-job="chat"><b>Ask</b><span>Talk through a lead, a call, or a messy note.</span></button>
          <button type="button" class="tile" data-job="crm_note"><b>CRM note draft</b><span>Write a note from facts if you only need copy. Live call saves it.</span></button>
          <button type="button" class="tile" data-job="email"><b>Customer email</b><span>Draft in Christopher’s voice. You copy it. Nobody sends from here.</span></button>
          <button type="button" class="tile" data-job="proposal"><b>Proposal copy</b><span>Formal packet wording. Price only if Christopher already set one.</span></button>
        </div>
      </div>

      <div id="panel-live" class="card hide" style="margin-top:12px">
        <h2>Live call</h2>
        <p class="muted">Stay on the phone. Dump scraps. The desk writes the CRM note. Still in CTE = Call, then Text, then Email. Past CTE = they connected; it books one real follow-up instead.</p>
        <label for="contact-q">Find their CRM contact</label>
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
        <label for="scraps">Call scraps</label>
        <textarea id="scraps" rows="6" placeholder="What they said, ZIP, size, site, next step…"></textarea>
        <p class="muted">CTE stage</p>
        <div class="choice">
          <label><input type="radio" name="cte" value="cte" checked /> Still in CTE — book Call / Text / Email</label>
          <label><input type="radio" name="cte" value="past" /> Past CTE — they connected, book a follow-up</label>
        </div>
        <div class="split">
          <div><label>Next action (optional)</label><input id="next-action" placeholder="Leave blank and the desk will set it" /></div>
          <div><label>Follow-up time (optional)</label><input id="follow-when" type="datetime-local" /></div>
        </div>
        <div class="row"><button type="button" id="call-save">Summarize &amp; save to CRM</button></div>
        <p class="err" id="err-live"></p>
        <div class="outbox" id="out-live"></div>
      </div>

      <div id="panel-chat" class="card hide" style="margin-top:12px">
        <h2>Ask</h2>
        <div class="log" id="log"></div>
        <form id="ask">
          <div id="composer">
            <textarea id="q" rows="2" placeholder="Tell me the lead or what you need written…" required></textarea>
            <button type="submit">Ask</button>
          </div>
          <p class="err" id="chat-err"></p>
        </form>
      </div>

      <div id="panel-crm_note" class="card hide" style="margin-top:12px">
        <h2>CRM note</h2>
        <p class="muted">Fill what you know. The desk writes the note. You paste it into the CRM.</p>
        <label>Name</label><input data-f="Name" />
        <label>Phone</label><input data-f="Phone" />
        <label>Email</label><input data-f="Email" />
        <label>ZIP / city</label><input data-f="ZIP / city" />
        <label>Size / grade</label><input data-f="Size / grade" placeholder="40HC CW" />
        <label>What they want</label><textarea data-f="What they want" rows="2"></textarea>
        <label>Site / tilt-bed</label><input data-f="Site / tilt-bed" />
        <label>Price Christopher set (leave blank if none)</label><input data-f="Price set by Christopher" />
        <div class="row"><button type="button" data-run="crm_note">Write note</button><button type="button" class="secondary" data-copy="crm_note">Copy</button></div>
        <p class="err" id="err-crm_note"></p>
        <div class="outbox" id="out-crm_note"></div>
      </div>

      <div id="panel-email" class="card hide" style="margin-top:12px">
        <h2>Customer email</h2>
        <p class="muted">Christopher’s voice. Draft only. Attach the PDF in Gmail yourself, or send it to Christopher to send.</p>
        <label>First name</label><input data-f="First name" />
        <label>What they asked for</label><input data-f="What they asked for" placeholder="one 40ft Standard" />
        <label>ZIP if you have it</label><input data-f="ZIP" />
        <label>Price Christopher set (leave blank if none)</label><input data-f="Price set by Christopher" />
        <label>Proposal attached?</label>
        <select data-f="Proposal attached">
          <option>Yes — official proposal attached below</option>
          <option>No — this is a first reply only</option>
        </select>
        <div class="row"><button type="button" data-run="email">Write email</button><button type="button" class="secondary" data-copy="email">Copy</button></div>
        <p class="err" id="err-email"></p>
        <div class="outbox" id="out-email"></div>
      </div>

      <div id="panel-proposal" class="card hide" style="margin-top:12px">
        <h2>Proposal copy</h2>
        <p class="muted">Customer wording only. If Christopher has not given a dollar amount, the copy will say ASK CHRISTOPHER.</p>
        <label>Prepared for</label><input data-f="Prepared for" />
        <label>Size / grade</label><input data-f="Size / grade" placeholder="1 × 40STD" />
        <label>Delivery ZIP / city</label><input data-f="Delivery ZIP / city" />
        <label>Price set by Christopher</label><input data-f="Price set by Christopher" placeholder="Leave blank if he has not set it" />
        <label>Extra facts</label><textarea data-f="Extra facts" rows="2"></textarea>
        <div class="row"><button type="button" data-run="proposal">Write proposal</button><button type="button" class="secondary" data-copy="proposal">Copy</button></div>
        <p class="err" id="err-proposal"></p>
        <div class="outbox" id="out-proposal"></div>
      </div>
      <footer>CBGC LLC DBA CBShippingSolutions · Text Christopher 870-323-2593 · Backup 870-682-3867</footer>
    </section>
  </main>
  <script>
    const login = document.getElementById("login");
    const desk = document.getElementById("desk");
    const outBtn = document.getElementById("out");
    const log = document.getElementById("log");
    const history = [];
    const panels = ["live", "chat", "crm_note", "email", "proposal"];
    let picked = null;
    let searchTimer = 0;

    function show(view) {
      login.classList.toggle("hide", view !== "login");
      desk.classList.toggle("hide", view !== "desk");
      outBtn.classList.toggle("hide", view !== "desk");
    }
    function openJob(job) {
      panels.forEach((id) => {
        document.getElementById("panel-" + id).classList.toggle("hide", id !== job);
      });
    }
    function bubble(role, text) {
      const d = document.createElement("div");
      d.className = "bubble " + (role === "user" ? "me" : "bot");
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }
    function fields(job) {
      const box = document.getElementById("panel-" + job);
      const out = {};
      box.querySelectorAll("[data-f]").forEach((el) => {
        const v = String(el.value || "").trim();
        if (v) out[el.getAttribute("data-f")] = v;
      });
      return out;
    }

    async function boot() {
      const r = await fetch("/session", { credentials: "same-origin" });
      const j = await r.json();
      if (!j.ok) { show("login"); return; }
      document.getElementById("hello").textContent = "Signed in as " + (j.user && j.user.name ? j.user.name : "rep") + ". Open Live call for a lead.";
      show("desk");
      openJob("live");
      if (!log.childElementCount) {
        bubble("assistant", "I am your CBSS desk. Live call writes the CRM note and books CTE or the follow-up. I do not send email. I do not invent a price.");
      }
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
      document.getElementById("hello").textContent = "Signed in as " + ((j.user && j.user.name) || "rep") + ". Open Live call for a lead.";
      show("desk");
      openJob("live");
      bubble("assistant", "I am your CBSS desk. Live call writes the CRM note and books CTE or the follow-up. I do not send email. I do not invent a price.");
    });

    outBtn.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      history.length = 0;
      log.innerHTML = "";
      show("login");
    });

    document.querySelectorAll(".tile").forEach((b) => {
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
        const err = document.getElementById("err-" + job);
        const box = document.getElementById("out-" + job);
        err.textContent = "";
        box.textContent = "Writing…";
        const r = await fetch("/job", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job, fields: fields(job) }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 401) { show("login"); return; }
        if (!r.ok) { err.textContent = j.error || "Try again."; box.textContent = ""; return; }
        box.textContent = j.reply || "";
      });
    });
    function renderPicked() {
      const box = document.getElementById("contact-sel");
      if (!picked) { box.classList.add("hide"); box.textContent = ""; return; }
      box.classList.remove("hide");
      box.textContent = "Selected: " + picked.name + (picked.phone ? " · " + picked.phone : "") + (picked.city ? " · " + picked.city : "") + (picked.stage ? " · " + picked.stage : "");
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
        b.textContent = (c.name || "Unnamed") + (c.phone ? " · " + c.phone : "") + (c.city ? " · " + c.city : "") + (c.owner ? " · " + c.owner : "");
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

    document.querySelectorAll("[data-copy]").forEach((b) => {
      b.addEventListener("click", async () => {
        const job = b.getAttribute("data-copy");
        const text = document.getElementById("out-" + job).textContent || "";
        if (!text) return;
        try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; setTimeout(() => b.textContent = "Copy", 1200); } catch (_) {}
      });
    });
    boot();
  </script>
</body>
</html>`;
}
