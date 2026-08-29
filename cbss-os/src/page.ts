import { BRAND } from "./brand.ts";

export function pageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="${BRAND.navy}" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${BRAND.title}</title>
  <style>
    :root {
      --navy: ${BRAND.navy};
      --gold: ${BRAND.gold};
      --paper: ${BRAND.paper};
      --card: #fff;
      --line: #d8d0be;
      --muted: #5B6570;
      --ink: #111111;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body { font-family: Helvetica, Arial, "Segoe UI", sans-serif; background: var(--paper); color: var(--ink); font-size: 15px; }
    .shell { min-height: 100%; display: grid; grid-template-columns: 232px 1fr; }
    aside {
      background: var(--navy); color: #fff; padding: 22px 16px 18px;
      display: flex; flex-direction: column; gap: 18px;
    }
    .seal {
      width: 54px; height: 54px; border: 2px solid var(--gold); border-radius: 50%;
      display: grid; place-items: center; font-family: "Times New Roman", Times, serif;
      font-size: 22px; font-weight: 700; color: var(--gold); letter-spacing: .04em;
    }
    .brand { font-weight: 700; letter-spacing: .05em; font-size: 13px; }
    .sub { color: var(--gold); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; margin-top: 4px; }
    .live { color: #9eb0c4; font-size: 11px; line-height: 1.4; }
    nav { display: flex; flex-direction: column; gap: 6px; }
    nav button {
      background: transparent; color: #d5deea; border: 1px solid transparent; border-radius: 8px;
      padding: 11px 12px; font: 650 14px inherit; cursor: pointer; text-align: left;
    }
    nav button.on { background: var(--gold); color: var(--navy); }
    .stage { min-width: 0; display: flex; flex-direction: column; }
    header {
      background: #10263f; color: #fff; padding: 12px 20px;
      display: flex; justify-content: space-between; gap: 12px; align-items: center;
      border-bottom: 3px solid var(--gold);
    }
    .who { font-size: 13px; color: #d5deea; }
    .right { display: flex; align-items: center; gap: 10px; }
    main { max-width: 1180px; width: 100%; margin: 0 auto; padding: 18px 18px 36px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
    h1 { font-size: 26px; margin: 0 0 6px; color: var(--navy); font-family: "Times New Roman", Times, serif; }
    h2 { font-size: 16px; margin: 0 0 10px; color: var(--navy); }
    h3 { font-size: 13px; margin: 14px 0 6px; color: var(--navy); letter-spacing: .04em; }
    p { line-height: 1.45; }
    .muted { color: var(--muted); font-size: 13px; margin: 0 0 10px; }
    label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 5px; color: #3d4d5c; }
    input, textarea, select {
      width: 100%; border: 1px solid var(--line); border-radius: 7px; padding: 10px 11px;
      font: 15px/1.4 inherit; color: var(--ink); background: #fff;
    }
    button { font: 650 14px inherit; border: 0; border-radius: 7px; padding: 10px 14px; background: var(--navy); color: #fff; cursor: pointer; }
    button.gold { background: var(--gold); color: var(--navy); }
    button.secondary { background: #fff; color: var(--navy); border: 1px solid var(--line); }
    button:disabled { opacity: .55; cursor: default; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    .err { color: #8A1F1F; font-size: 13px; min-height: 1.1em; margin: 8px 0 0; }
    .ok { color: #1f5b38; font-size: 13px; }
    .hide { display: none !important; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .split3 { display: grid; grid-template-columns: 2fr 80px 1fr; gap: 10px; }
    .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .tile { cursor: pointer; min-height: 132px; }
    .tile .kicker { color: var(--gold); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
    .picks { display: flex; flex-wrap: wrap; gap: 6px; }
    .picks button { background: #fff; color: var(--navy); border: 1px solid var(--line); }
    .picks button.on { background: var(--navy); color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--line); }
    tr.sel td { background: #FBF6E8; }
    .stat { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; margin: 0 0 12px; }
    .stat strong { color: var(--navy); }
    .board { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 10px; overflow: auto; }
    .col { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px; min-height: 140px; }
    .col h3 { margin: 0 0 8px; font-size: 12px; color: var(--gold); letter-spacing: .04em; }
    .pc { border: 1px solid var(--line); border-radius: 8px; padding: 8px; margin: 0 0 8px; background: var(--paper); }
    .note { border-bottom: 1px dashed var(--line); padding: 8px 0; font-size: 13px; }
    .hits { border: 1px solid var(--line); border-radius: 8px; }
    .hit { padding: 10px 11px; border-bottom: 1px solid var(--line); }
    .hit:last-child { border-bottom: 0; }
    .outbox { white-space: pre-wrap; background: #f7fafc; border: 1px dashed var(--line); border-radius: 8px; padding: 11px; min-height: 4em; font-size: 14px; }
    .warn { background: #FBF6E8; border: 1px solid #e3d7a8; border-radius: 8px; padding: 10px; font-size: 13px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--line); border-radius: 999px; padding: 4px 9px; font-size: 11px; background: #fff; color: var(--navy); }
    .chip.on { background: #e8f5ee; border-color: #c8e4d4; }
    .chip.off { background: #f8ecec; border-color: #e4c8c8; }
    .login-wrap { min-height: 100%; display: grid; place-items: center; padding: 24px 14px; }
    .login-card { width: min(460px, 100%); }
    .login-card .seal { margin-bottom: 12px; }
    footer { margin-top: 16px; color: var(--muted); font-size: 11px; }
    .gate { display: contents; }
    @media (max-width: 860px) {
      .shell { grid-template-columns: 1fr; }
      aside { padding: 14px 12px 10px; }
      nav { flex-direction: row; flex-wrap: wrap; }
      nav button { min-height: 44px; }
      .split, .split3, .board, .tiles { grid-template-columns: 1fr; }
      header, main { padding-left: 12px; padding-right: 12px; }
      button { min-height: 44px; }
    }
  </style>
</head>
<body>
  <div id="login" class="login-wrap">
    <section class="card login-card">
      <div class="seal">CB</div>
      <h1>CBSS Platform</h1>
      <p class="muted">One navy/gold shell for CRM, Desk, Proposal, and Money. Company email only. Same password as the CRM. This platform does not replace the live tools.</p>
      <form id="login-form">
        <label for="email">Company email</label>
        <input id="email" type="email" autocomplete="username" placeholder="you@cbshippingsolutions.com" required />
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" required />
        <div class="row"><button type="submit" class="gold">Open platform</button></div>
        <p class="err" id="login-err"></p>
      </form>
    </section>
  </div>

  <div id="app" class="shell hide">
    <aside>
      <div>
        <div class="seal">CB</div>
        <div class="brand">CB SHIPPING SOLUTIONS</div>
        <div class="sub" id="stamp">${BRAND.stamp}</div>
        <p class="live">Live tools stay on their own workers. This is the side platform.</p>
      </div>
      <nav id="nav">
        <button type="button" class="on" data-mod="home">Home</button>
        <button type="button" data-mod="crm">CRM</button>
        <button type="button" data-mod="desk">Desk</button>
        <button type="button" data-mod="proposal">Proposal</button>
        <button type="button" data-mod="money">Money</button>
      </nav>
    </aside>
    <div class="stage">
      <header>
        <div>
          <div class="brand">CBSS PLATFORM</div>
          <div class="sub">CRM · Desk · Proposal · Money</div>
        </div>
        <div class="right">
          <div class="who" id="who"></div>
          <button type="button" class="secondary" id="out">Sign out</button>
        </div>
      </header>
      <main>
        <section id="mod-home">
          <h1>One book. Four models.</h1>
          <p class="muted">The live CRM, Desk, Proposal, Pay, and Invoice workers are unchanged. Sign in once here and work them in this brand.</p>
          <div class="chips" id="tool-chips"></div>
          <div class="tiles" style="margin-top:14px">
            <div class="card tile" data-go="crm"><div class="kicker">Book</div><h2>CRM</h2><p class="muted">Contacts, follow-ups, tasks, pipeline, notes.</p></div>
            <div class="card tile" data-go="desk"><div class="kicker">Calls</div><h2>Desk</h2><p class="muted">Call scraps, email templates, CBSS AI. I will not invent a price.</p></div>
            <div class="card tile" data-go="proposal"><div class="kicker">Quote</div><h2>Proposal</h2><p class="muted">Posted xChange wholesale only. Own the door type.</p></div>
            <div class="card tile" data-go="money"><div class="kicker">Collect</div><h2>Money</h2><p class="muted">Navy/gold invoice — ACH / wire or card. Veem still waiting.</p></div>
          </div>
          <div class="warn" style="margin-top:14px">Do not invent a price. Do not mix Side door OS 2D, Side door OS 4D, and Full open. This tool does not send Gmail. Company email only @cbshippingsolutions.com.</div>
        </section>

        <section id="mod-crm" class="hide">
          <div class="stat" id="crm-stat"></div>
          <div class="row" style="margin-top:0">
            <button type="button" class="gold" data-crm="contacts">Contacts</button>
            <button type="button" class="secondary" data-crm="followups">Follow-ups</button>
            <button type="button" class="secondary" data-crm="tasks">Tasks</button>
            <button type="button" class="secondary" data-crm="pipeline">Pipeline</button>
          </div>
          <div class="card" style="margin-top:12px">
            <div id="crm-contacts">
              <div class="split">
                <div><label>Search</label><input id="crm-q" placeholder="Name, phone, city, company" /></div>
                <div>
                  <label>Owner</label>
                  <select id="crm-owner">
                    <option value="all">All</option>
                    <option value="mine">Mine</option>
                    <option value="New/Unassigned">New/Unassigned</option>
                  </select>
                </div>
              </div>
              <div class="split" style="margin-top:12px">
                <div style="overflow:auto">
                  <table><thead><tr><th>Name</th><th>Company</th><th>City</th><th>Owner</th><th>Stage</th></tr></thead><tbody id="crm-rows"></tbody></table>
                </div>
                <div id="crm-detail"><p class="muted">Select a contact to view details</p></div>
              </div>
            </div>
            <div id="crm-followups" class="hide"></div>
            <div id="crm-tasks" class="hide"></div>
            <div id="crm-pipeline" class="hide"></div>
            <p class="err" id="crm-err"></p>
          </div>
        </section>

        <section id="mod-desk" class="hide">
          <div class="card">
            <h2>Call scraps</h2>
            <p class="muted">I will not invent a price. Saves a real CRM note. Home delivery is cash before the truck.</p>
            <label>Find contact</label>
            <input id="desk-q" placeholder="Search CRM contacts" />
            <div class="hits" id="desk-hits"></div>
            <label>Call scraps</label>
            <textarea id="desk-scraps" rows="4" placeholder="What they said, ZIP, box, next step"></textarea>
            <label class="row" style="margin-top:8px"><input id="desk-past" type="checkbox" style="width:auto" /> Past CTE — book one real follow-up</label>
            <div class="split">
              <div><label>Next action</label><input id="desk-action" placeholder="Call about site access" /></div>
              <div><label>Follow-up date</label><input id="desk-when" type="datetime-local" /></div>
            </div>
            <div class="row"><button type="button" id="desk-save">Save to CRM</button></div>
            <p class="err" id="desk-err"></p>
          </div>
          <div class="card" style="margin-top:12px">
            <h2>Email templates</h2>
            <p class="muted">This tool does not send from Gmail. Copy or open Gmail, then save sent to CRM.</p>
            <select id="desk-tpl"></select>
            <div class="row">
              <button type="button" class="secondary" id="desk-render">Fill template</button>
              <button type="button" class="secondary" id="desk-copy">Copy</button>
            </div>
            <div class="outbox" id="desk-body">Pick a template.</div>
          </div>
          <div class="card" style="margin-top:12px">
            <h2>CBSS AI for Sales</h2>
            <p class="muted">I will not invent a price. Competitor numbers stay theirs, not a CBSS quote.</p>
            <textarea id="desk-ai" rows="2" placeholder="Ask your CBSS AI for Sales…"></textarea>
            <div class="row"><button type="button" id="desk-ask">Ask CBSS AI</button></div>
            <div class="outbox" id="desk-ai-out"></div>
          </div>
        </section>

        <section id="mod-proposal" class="hide">
          <div class="card">
            <h2>Proposal Builder · One depot · Delivered or pickup cash</h2>
            <p class="muted">Posted xChange wholesale only. Do not invent a price. OS 2D, OS 4D, and Full open side are different boxes — do not mix them.</p>
            <div class="warn">Side door OS 2D ≠ Side door OS 4D ≠ Full open side. Pick the exact config the yard posted.</div>
            <label>Size</label>
            <div class="picks" id="p-size"></div>
            <label>Height</label>
            <div class="picks" id="p-height"></div>
            <label>Config</label>
            <div class="picks" id="p-config"></div>
            <label>Grade</label>
            <div class="picks" id="p-grade"></div>
            <div class="split">
              <div><label>ZIP</label><input id="p-zip" inputmode="numeric" maxlength="10" placeholder="72201" /></div>
              <div><label>Qty</label><input id="p-qty" inputmode="numeric" value="1" /></div>
            </div>
            <div class="row">
              <button type="button" class="secondary" id="p-pull">Pull xChange</button>
              <button type="button" class="gold" id="p-match">Find posted box</button>
            </div>
            <p class="muted" id="p-status">No wholesale until xChange posts one.</p>
            <div class="split">
              <div>
                <label>Fulfillment</label>
                <select id="p-ful"><option value="deliver">Delivered</option><option value="pickup">Picked up</option></select>
              </div>
              <div><label>Net margin (min $300)</label><input id="p-margin" inputmode="decimal" value="700" /></div>
            </div>
            <label>Posted wholesale (do not invent)</label>
            <input id="p-wholesale" inputmode="decimal" placeholder="Blank unless xChange posted it" />
            <label>Cash each</label>
            <input id="p-cash" inputmode="decimal" placeholder="Formula from posted wholesale + typed margin" />
            <div class="split">
              <div><label>Customer name</label><input id="p-name" /></div>
              <div><label>Customer email</label><input id="p-email" type="email" /></div>
              <div><label>Phone</label><input id="p-phone" /></div>
              <div><label>Company</label><input id="p-co" /></div>
            </div>
            <label>Delivery / pickup location</label>
            <input id="p-del" />
            <label>Notes</label>
            <textarea id="p-notes" rows="2"></textarea>
            <div class="row"><button type="button" id="p-send">Submit proposal</button></div>
            <p class="err" id="p-err"></p>
          </div>
        </section>

        <section id="mod-money" class="hide">
          <div class="card">
            <h2>Invoice — navy/gold · ACH / wire or card</h2>
            <p class="muted">Money in. The amount is the number from the proposal after the customer agreed — do not change it. ACH / wire only still gives them the invoice with no card link. This tool does not send Gmail.</p>
            <div class="split">
              <div><label>Customer name</label><input id="i-name" required /></div>
              <div><label>Customer email</label><input id="i-email" type="email" /></div>
              <div><label>Phone</label><input id="i-phone" /></div>
              <div><label>Amount USD</label><input id="i-amount" inputmode="decimal" placeholder="Agreed proposal cash" /></div>
              <div><label>Company</label><input id="i-co" /></div>
              <div>
                <label>Warranty</label>
                <select id="i-warr">
                  <option value="wwt">WWT — 5-year structural + 5-year no-leak</option>
                  <option value="one-trip">One-trip — 10-year + manufacturer</option>
                </select>
              </div>
            </div>
            <h3>Billing address</h3>
            <label>Street</label><input id="i-bstreet" />
            <div class="split3">
              <div><label>City</label><input id="i-bcity" /></div>
              <div><label>State</label><input id="i-bstate" maxlength="2" /></div>
              <div><label>ZIP</label><input id="i-bzip" /></div>
            </div>
            <label class="row"><input id="i-same" type="checkbox" style="width:auto" /> Delivery is the same as billing</label>
            <h3>Delivery address</h3>
            <label>Street</label><input id="i-dstreet" />
            <div class="split3">
              <div><label>City</label><input id="i-dcity" /></div>
              <div><label>State</label><input id="i-dstate" maxlength="2" /></div>
              <div><label>ZIP</label><input id="i-dzip" /></div>
            </div>
            <label>What this invoice is for</label>
            <textarea id="i-notes" rows="2" placeholder="40HC CW delivered — paid before the truck"></textarea>
            <div class="row">
              <button type="button" class="secondary" id="i-lookup">Use last agreed proposal amount</button>
              <button type="button" class="gold" id="i-ach">Invoice — ACH / wire only</button>
              <button type="button" id="i-card">Invoice + card pay link</button>
              <button type="button" class="secondary" id="i-gmail">Open Gmail</button>
            </div>
            <p class="err" id="i-err"></p>
            <div class="outbox" id="i-out">The invoice card lands here.</div>
          </div>
          <div class="card" style="margin-top:12px">
            <h2>Recent invoices</h2>
            <div class="row"><button type="button" class="secondary" id="i-list">Refresh</button></div>
            <div class="hits" id="i-hits"></div>
          </div>
          <div class="card" style="margin-top:12px">
            <h2>Veem payment request</h2>
            <p class="muted">VEEM PAYMENT REQUEST — not a CBSS quote. Production API is not open yet. Use invoicing for money in unless Christopher says Veem is live.</p>
            <div class="split">
              <div><label>Customer name</label><input id="v-name" /></div>
              <div><label>Email</label><input id="v-email" type="email" /></div>
              <div><label>Phone</label><input id="v-phone" /></div>
              <div><label>Amount USD</label><input id="v-amount" inputmode="decimal" /></div>
              <div><label>City</label><input id="v-city" /></div>
              <div><label>State</label><input id="v-state" maxlength="2" placeholder="AR" /></div>
              <div><label>ZIP</label><input id="v-zip" /></div>
              <div><label>Street</label><input id="v-street" /></div>
            </div>
            <label>What this is for</label>
            <textarea id="v-notes" rows="2"></textarea>
            <div class="row"><button type="button" class="secondary" id="v-create">Create Veem request</button></div>
            <p class="err" id="v-err"></p>
            <div class="outbox" id="v-out">The pay card lands here.</div>
          </div>
        </section>
        <footer>${BRAND.company} · side platform · live tools unchanged</footer>
      </main>
    </div>
  </div>
  <script>
    const STAGES = ["New Lead","Contacted","Quote","Proposal Sent","Flex Buy","Won","Lost","DNC"];
    const SIZES = [{v:"20",l:"20 ft"},{v:"40",l:"40 ft"},{v:"10",l:"10 ft"},{v:"45",l:"45 ft"},{v:"53",l:"53 ft"}];
    const HEIGHTS = [{v:"DC",l:"Standard / DC"},{v:"HC",l:"High cube / HC"}];
    const CONFIGS = [
      {v:"standard",l:"Standard"},{v:"double-door",l:"Double door"},
      {v:"side-os-2d",l:"Side door (OS 2D)"},{v:"side-os-4d",l:"Side door (OS 4D)"},
      {v:"full-open-side",l:"Full open side"},{v:"tri-door",l:"Tri-door"}
    ];
    const GRADES = [{v:"WWT",l:"WWT"},{v:"CW",l:"CW"},{v:"IICL",l:"IICL / Multi-Trip"},{v:"OneTrip",l:"One-Trip"},{v:"AsIs",l:"As-Is"}];
    let user = null, book = null, selected = null, deskContact = null, lastGmail = "", pick = {size:"40",height:"HC",config:"standard",grade:"WWT"};
    let offers = [];

    function $(id){ return document.getElementById(id); }
    function esc(s){
      return String(s||"").replace(/[&<>"']/g, function(c){
        return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c];
      });
    }
    function show(view){
      $("login").classList.toggle("hide", view!=="login");
      $("app").classList.toggle("hide", view!=="app");
    }
    function greet(name){ $("who").textContent = name || "Rep"; }
    function paintTools(tools){
      const order = [["crm","CRM"],["desk","Desk"],["proposal","Proposal"],["invoice","Invoice"],["pay","Pay"]];
      $("tool-chips").innerHTML = order.map(function(row){
        const on = tools && tools[row[0]];
        return '<span class="chip '+(on?"on":"off")+'">'+row[1]+" "+(on?"connected":"not signed in")+"</span>";
      }).join("");
    }
    function openMod(mod){
      document.querySelectorAll("#nav [data-mod]").forEach(function(b){ b.classList.toggle("on", b.dataset.mod===mod); });
      ["home","crm","desk","proposal","money"].forEach(function(m){ $("mod-"+m).classList.toggle("hide", m!==mod); });
      if (mod==="desk") loadTemplates();
      if (mod==="money") loadInvoices();
    }
    async function api(path, opt){
      const r = await fetch(path, Object.assign({ credentials:"same-origin", headers:{ "Content-Type":"application/json" } }, opt||{}));
      const j = await r.json().catch(function(){ return {}; });
      if (r.status===401){ show("login"); throw new Error("Sign in first."); }
      return { r:r, j:j };
    }
    function money(n){ return "$" + Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function mineName(){ return (user && (user.name||user.email)||"").split("@")[0]; }

    document.getElementById("login-form").addEventListener("submit", async function(e){
      e.preventDefault();
      $("login-err").textContent = "";
      const res = await api("/auth/login", { method:"POST", body: JSON.stringify({ email:$("email").value, password:$("password").value }) });
      if (!res.r.ok || !res.j.ok){ $("login-err").textContent = res.j.error || "Could not sign in."; return; }
      user = res.j.user; greet(user.name); paintTools(user.tools); show("app"); openMod("home"); loadCrm();
    });
    $("out").addEventListener("click", async function(){ await api("/auth/logout",{method:"POST"}); show("login"); });
    document.querySelectorAll("#nav [data-mod]").forEach(function(btn){
      btn.addEventListener("click", function(){ openMod(btn.dataset.mod); });
    });
    document.querySelectorAll("[data-go]").forEach(function(tile){
      tile.addEventListener("click", function(){ openMod(tile.getAttribute("data-go")); });
    });
    document.querySelectorAll("[data-crm]").forEach(function(btn){
      btn.addEventListener("click", function(){
        ["contacts","followups","tasks","pipeline"].forEach(function(v){ $("crm-"+v).classList.toggle("hide", v!==btn.dataset.crm); });
        if (btn.dataset.crm==="followups") renderFollowups();
        if (btn.dataset.crm==="tasks") renderTasks();
        if (btn.dataset.crm==="pipeline") renderPipeline();
      });
    });

    async function loadCrm(){
      $("crm-err").textContent = "Loading book…";
      const res = await api("/x/crm/crm-data?action=get&omitNotes=1");
      if (!res.r.ok){ $("crm-err").textContent = "Could not load CRM."; return; }
      const j = res.j;
      const contacts = (j.contacts||[]).slice();
      const added = j.contactsAdded||[];
      const ids = new Set(contacts.map(function(c){ return String(c.id); }));
      added.forEach(function(a){ if(!ids.has(String(a.id))){ contacts.unshift(a); ids.add(String(a.id)); } });
      contacts.forEach(function(c){
        const ed = (j.contactEdits||{})[c.id] || (j.contactEdits||{})[String(c.id)];
        if (ed) Object.assign(c, ed);
        if (c.status==="Quoted") c.status="Quote";
        if (c.status==="Connected"||c.status==="Connecting") c.status="Contacted";
        if (!c.owner && String(c.source||"")==="Quote Form") c.owner="New/Unassigned";
      });
      book = { contacts:contacts, deals:j.deals||[], followups:j.followups||{}, completed:j.completedTasks||{} };
      $("crm-err").textContent = "";
      renderStats(); renderContacts();
    }
    function working(){ return ((book&&book.contacts)||[]).filter(function(c){ return !c.archived && c.status!=="DNC"; }); }
    function renderStats(){
      if (!book) return;
      const w = working();
      const due = Object.values(book.followups||{}).filter(function(f){ return f && f.followUpDate && !f.completed; }).length;
      $("crm-stat").innerHTML = "<span><strong>"+w.length+"</strong> working</span><span><strong>"+(book.deals||[]).length+"</strong> deals</span><span><strong>"+due+"</strong> follow-ups</span>";
    }
    function filtered(){
      const q = $("crm-q").value.trim().toLowerCase();
      const own = $("crm-owner").value;
      return working().filter(function(c){
        if (own==="mine" && String(c.owner||"").toLowerCase().indexOf(mineName().toLowerCase())<0) return false;
        if (own==="New/Unassigned" && c.owner!=="New/Unassigned") return false;
        if (!q) return true;
        return [c.name,c.company,c.phone,c.city,c.email,c.owner].join(" ").toLowerCase().indexOf(q)>=0;
      }).slice(0,80);
    }
    function renderContacts(){
      if (!book) return;
      $("crm-rows").innerHTML = filtered().map(function(c){
        return '<tr data-id="'+esc(String(c.id))+'"><td>'+esc(c.name||"")+"</td><td>"+esc(c.company||"")+"</td><td>"+esc(c.city||"")+"</td><td>"+esc(c.owner||"")+"</td><td>"+esc(c.status||"")+"</td></tr>";
      }).join("");
    }
    $("crm-q").addEventListener("input", renderContacts);
    $("crm-owner").addEventListener("change", renderContacts);
    $("crm-rows").addEventListener("click", function(e){
      const tr = e.target.closest("tr");
      if (!tr) return;
      openContact(tr.getAttribute("data-id"));
    });
    async function openContact(id){
      selected = (book.contacts||[]).find(function(c){ return String(c.id)===String(id); });
      if (!selected) return;
      document.querySelectorAll("#crm-rows tr").forEach(function(tr){ tr.classList.toggle("sel", tr.getAttribute("data-id")===String(id)); });
      const res = await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"getNotes", contactId:String(id) }) });
      const notes = (res.j.notes && (res.j.notes[id]||res.j.notes[String(id)])) || selected.notes || [];
      selected.notes = notes;
      const fu = (book.followups||{})[id] || (book.followups||{})[String(id)] || {};
      $("crm-detail").innerHTML = "<h2>"+esc(selected.name||"")+"</h2>"
        +'<p class="muted">'+esc([selected.company,selected.phone,selected.city,selected.state].filter(Boolean).join(" · "))+"</p>"
        +"<p>Owner "+esc(selected.owner||"")+" · "+esc(selected.status||"")+(selected.amount?" · "+money(selected.amount):"")+"</p>"
        +'<label>Follow-up</label><input id="fu-act" value="'+esc(fu.nextAction||"")+'" placeholder="e.g. Call about 40ft WWT pricing" />'
        +'<input id="fu-date" type="datetime-local" value="'+esc((fu.followUpDate||"").slice(0,16))+'" />'
        +'<div class="row"><button type="button" class="secondary" id="fu-save">Save follow-up</button><button type="button" id="fu-done">Complete</button></div>'
        +'<label>Add note</label><textarea id="note-text" rows="2"></textarea><div class="row"><button type="button" class="secondary" id="note-add">Add note</button></div>'
        +"<div>"+(notes.slice(0,12).map(function(n){ return '<div class="note"><strong>'+esc(n.tag||n.author||"")+"</strong> "+esc(n.timestamp||"")+"<div>"+esc(n.text||"")+"</div></div>"; }).join("")||'<p class="muted">No notes yet.</p>')+"</div>";
      $("fu-save").onclick = saveFollowup;
      $("fu-done").onclick = completeTask;
      $("note-add").onclick = addNote;
    }
    async function saveFollowup(){
      if (!selected) return;
      const patch = {};
      patch[selected.id] = { nextAction:$("fu-act").value, followUpDate:$("fu-date").value };
      await api("/x/crm/crm-data?action=saveFollowups", { method:"POST", body: JSON.stringify({ action:"saveFollowups", followups: patch }) });
      book.followups[selected.id] = patch[selected.id];
      renderStats();
    }
    async function completeTask(){
      if (!selected) return;
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"completeFollowup", contactId:String(selected.id), nextAction:$("fu-act").value }) });
      delete book.followups[selected.id];
      renderStats(); openContact(selected.id);
    }
    async function addNote(){
      if (!selected) return;
      const text = $("note-text").value.trim();
      if (!text) return;
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"appendNote", contactId:String(selected.id), text:text, tag:"Desk" }) });
      openContact(selected.id);
    }
    function renderFollowups(){
      const rows = working().filter(function(c){
        const f = book.followups[c.id]||book.followups[String(c.id)];
        return f && f.nextAction && !f.completed;
      });
      $("crm-followups").innerHTML = "<h2>Follow-ups</h2>"+(rows.map(function(c){
        const f = book.followups[c.id]||book.followups[String(c.id)];
        return '<div class="hit"><strong>'+esc(c.name)+"</strong><div>"+esc(f.nextAction||"")+" · "+esc(f.followUpDate||"")+"</div></div>";
      }).join("")||'<p class="muted">No open follow-ups.</p>');
    }
    function renderTasks(){ renderFollowups(); $("crm-tasks").innerHTML = $("crm-followups").innerHTML.replace("Follow-ups","Tasks"); }
    function renderPipeline(){
      const deals = book.deals||[];
      $("crm-pipeline").innerHTML = '<div class="board">'+STAGES.map(function(st){
        const cards = deals.filter(function(d){ return (d.stage||"")==st || (st==="Quote"&&d.stage==="Quoted"); });
        return '<div class="col"><h3>'+st+"</h3>"+cards.slice(0,20).map(function(d){ return '<div class="pc"><div>'+esc(d.name||d.contactName||"")+'</div><div class="muted">'+esc(d.owner||"")+(d.amount?" · "+money(d.amount):"")+"</div></div>"; }).join("")+"</div>";
      }).join("")+"</div>";
    }

    async function loadTemplates(){
      const res = await api("/x/desk/templates");
      const tpls = res.j.templates||[];
      $("desk-tpl").innerHTML = tpls.map(function(t){ return '<option value="'+esc(t.id)+'">'+esc(t.group||"")+" — "+esc(t.title||t.id)+"</option>"; }).join("");
    }
    $("desk-q").addEventListener("input", async function(){
      const q = $("desk-q").value.trim();
      if (q.length<2){ $("desk-hits").innerHTML=""; return; }
      const res = await api("/x/desk/contacts?q="+encodeURIComponent(q));
      const rows = res.j.contacts||[];
      $("desk-hits").innerHTML = rows.slice(0,8).map(function(c){ return '<div class="hit" data-desk="'+esc(String(c.id))+'"><strong>'+esc(c.name||"")+"</strong><div>"+esc(c.phone||"")+" · "+esc(c.city||"")+"</div></div>"; }).join("");
    });
    $("desk-hits").addEventListener("click", function(e){
      const hit = e.target.closest("[data-desk]");
      if (!hit) return;
      deskContact = ((book && book.contacts)||[]).find(function(c){ return String(c.id)===hit.getAttribute("data-desk"); }) || { id: hit.getAttribute("data-desk"), name: hit.querySelector("strong").textContent };
      $("desk-q").value = deskContact.name||"";
    });
    $("desk-save").addEventListener("click", async function(){
      $("desk-err").textContent="";
      if (!deskContact){ $("desk-err").textContent="Search and pick a contact first."; return; }
      const res = await api("/x/desk/call/save", { method:"POST", body: JSON.stringify({
        contactId: deskContact.id, scraps: $("desk-scraps").value, pastCte: $("desk-past").checked,
        nextAction: $("desk-action").value, followUpDate: $("desk-when").value
      }) });
      $("desk-err").textContent = (!res.r.ok||!res.j.ok) ? (res.j.error||"Could not save to the CRM.") : (res.j.summary || "Saved to CRM.");
    });
    $("desk-render").addEventListener("click", async function(){
      const res = await api("/x/desk/templates/render", { method:"POST", body: JSON.stringify({ id: $("desk-tpl").value, name: deskContact && deskContact.name, firstName: (deskContact&&deskContact.name||"").split(" ")[0] }) });
      $("desk-body").textContent = res.j.body || res.j.text || JSON.stringify(res.j);
    });
    $("desk-copy").addEventListener("click", async function(){ try { await navigator.clipboard.writeText($("desk-body").textContent||""); } catch (e) {} });
    $("desk-ask").addEventListener("click", async function(){
      $("desk-ai-out").textContent = "Asking…";
      const res = await api("/x/desk/chat", { method:"POST", body: JSON.stringify({ message: $("desk-ai").value }) });
      $("desk-ai-out").textContent = res.j.reply || res.j.text || res.j.error || "No reply.";
    });

    function picks(el, items, key){
      el.innerHTML = items.map(function(it){ return '<button type="button" data-v="'+it.v+'">'+it.l+"</button>"; }).join("");
      el.addEventListener("click", function(e){
        const b = e.target.closest("button"); if(!b) return;
        pick[key]=b.dataset.v;
        el.querySelectorAll("button").forEach(function(x){ x.classList.toggle("on", x===b); });
      });
      const first = el.querySelector('[data-v="'+pick[key]+'"]');
      if (first) first.classList.add("on");
    }
    picks($("p-size"), SIZES, "size"); picks($("p-height"), HEIGHTS, "height");
    picks($("p-config"), CONFIGS, "config"); picks($("p-grade"), GRADES, "grade");

    function offerMatches(o){
      const size = String(o.size||"");
      const wantSize = pick.size + pick.height;
      if (size.replace(/\\s/g,"").indexOf(wantSize)<0 && size.indexOf(pick.size)<0) return false;
      if (pick.config==="side-os-2d" && !/OS 2D|Open Side 2/i.test(size)) return false;
      if (pick.config==="side-os-4d" && !/OS 4D|Open Side 4/i.test(size)) return false;
      if (pick.config==="full-open-side" && !/Full open|Open Side(?! 2| 4)/i.test(size)) return false;
      if (pick.config==="double-door" && !/Double Door/i.test(size)) return false;
      if (pick.config==="standard" && /Double Door|Open Side|OS |Full open|Tri-door/i.test(size)) return false;
      const g = String(o.condition||"");
      if (pick.grade==="WWT" && !/WWT|Wind/i.test(g) && !/New/i.test(g)) return false;
      return typeof o.wholesaleCost==="number" && o.wholesaleCost>0;
    }
    function sizeToken(){
      if (pick.size==="20") return "20ft";
      if (pick.size==="40") return "40ft";
      return "Specialized";
    }
    $("p-pull").addEventListener("click", async function(){
      $("p-status").textContent = "Pulling posted xChange book…";
      const res = await api("/x/proposal/inventory/refresh", { method:"POST", body: "{}" });
      offers = res.j.offers||[];
      $("p-status").textContent = res.r.ok ? (offers.length+" posted offers. Not a CBSS quote.") : (res.j.error||"Refresh failed. Do not invent a wholesale.");
    });
    $("p-match").addEventListener("click", async function(){
      if (!offers.length){
        const res = await api("/x/proposal/inventory");
        offers = res.j.offers||[];
      }
      const hits = offers.filter(offerMatches);
      if (!hits.length){ $("p-wholesale").value=""; $("p-status").textContent="No posted match for that exact box. Do not invent a wholesale."; return; }
      hits.sort(function(a,b){ return a.wholesaleCost-b.wholesaleCost; });
      const o = hits[0];
      $("p-wholesale").value = String(o.wholesaleCost);
      $("p-status").textContent = o.size+" · "+o.condition+" · "+(o.depot||o.city)+" · posted "+money(o.wholesaleCost)+" · qty "+(o.qty||"?")+". That number is theirs, not a CBSS quote.";
      const wholesale = Number(o.wholesaleCost)||0;
      const margin = Math.max(300, Number($("p-margin").value)||700);
      $("p-cash").value = String(Math.ceil((wholesale+margin)/25)*25);
    });
    $("p-send").addEventListener("click", async function(){
      $("p-err").textContent="";
      const wholesale = Number($("p-wholesale").value);
      if (!wholesale){ $("p-err").textContent="Need a posted xChange wholesale. Do not invent one."; return; }
      const res = await api("/x/proposal/submit-proposal", { method:"POST", body: JSON.stringify({
        customerName:$("p-name").value, email:$("p-email").value, phone:$("p-phone").value, company:$("p-co").value,
        zip:$("p-zip").value, delivery:$("p-del").value, quantity:$("p-qty").value,
        wholesaleCost:wholesale, unitPrice:Number($("p-cash").value), netMargin:Number($("p-margin").value),
        fulfillment:$("p-ful").value, containerSize: sizeToken(),
        condition: pick.grade, notes:$("p-notes").value,
        containerDesc: pick.size+" "+pick.height+" "+CONFIGS.find(function(c){ return c.v===pick.config; }).l+" "+pick.grade,
        clientType:"Residential", paymentMode:"cash",
        repName: user && user.name, repEmail: user && user.email
      })});
      $("p-err").textContent = res.j.status==="sent" ? "Proposal generated and emailed." : (res.j.status==="flagged" ? "LOW MARGIN FLAG — below $300." : (res.j.error||"Could not submit."));
    });

    async function makeInvoice(payMethod){
      $("i-err").textContent="";
      $("i-out").textContent = payMethod==="ach" ? "Creating the branded ACH / wire invoice…" : "Creating the branded invoice…";
      const same = $("i-same").checked;
      const res = await api("/x/invoice/invoice/create", { method:"POST", body: JSON.stringify({
        name:$("i-name").value, email:$("i-email").value, phone:$("i-phone").value, amountRaw:$("i-amount").value,
        notes:$("i-notes").value, company:$("i-co").value, warrantyKind:$("i-warr").value,
        billingStreet:$("i-bstreet").value, billingCity:$("i-bcity").value,
        billingState:$("i-bstate").value, billingZip:$("i-bzip").value,
        deliveryStreet: same?$("i-bstreet").value:$("i-dstreet").value,
        deliveryCity:same?$("i-bcity").value:$("i-dcity").value,
        deliveryState:same?$("i-bstate").value:$("i-dstate").value,
        deliveryZip:same?$("i-bzip").value:$("i-dzip").value,
        sameAsBilling: same, payMethod:payMethod
      })});
      if (!res.r.ok || !res.j.ok){ $("i-err").textContent=res.j.error||"Could not create that invoice."; $("i-out").textContent="The invoice card lands here."; return; }
      $("i-out").textContent = res.j.cardText||"";
      lastGmail = (res.j.card && res.j.card.gmailLink)||"";
    }
    $("i-ach").addEventListener("click", function(){ makeInvoice("ach"); });
    $("i-card").addEventListener("click", function(){ makeInvoice("card"); });
    $("i-gmail").addEventListener("click", function(){ if(!lastGmail){ $("i-err").textContent="Create an invoice first."; return;} window.open(lastGmail,"_blank","noopener"); });
    $("i-lookup").addEventListener("click", async function(){
      $("i-err").textContent = "Looking up the last agreed proposal amount…";
      const res = await api("/x/invoice/invoice/lookup", { method:"POST", body: JSON.stringify({ email:$("i-email").value, phone:$("i-phone").value }) });
      if (!res.r.ok || !res.j.ok || !res.j.amount){ $("i-err").textContent = res.j.error || "No agreed proposal amount on that contact."; return; }
      $("i-amount").value = String(res.j.amount);
      $("i-err").textContent = "";
    });
    async function loadInvoices(){
      const res = await api("/x/invoice/invoice/list");
      const cards = res.j.cards||[];
      $("i-hits").innerHTML = cards.slice(0,12).map(function(c){
        return '<div class="hit"><strong>'+esc(c.name||"")+" · "+esc(c.documentNumber||c.id||"")+" · "+(c.amount?money(c.amount):"")+"</strong><div>"+esc(c.status||"")+(c.payMethod?" · "+c.payMethod:"")+"</div></div>";
      }).join("") || '<p class="muted">No invoices in this list yet.</p>';
    }
    $("i-list").addEventListener("click", loadInvoices);
    $("v-create").addEventListener("click", async function(){
      $("v-err").textContent="";
      const res = await api("/x/pay/pay/create", { method:"POST", body: JSON.stringify({
        name:$("v-name").value, email:$("v-email").value, phone:$("v-phone").value, amountRaw:$("v-amount").value,
        notes:$("v-notes").value, city:$("v-city").value, state:$("v-state").value, zip:$("v-zip").value, street:$("v-street").value
      })});
      $("v-out").textContent = res.j.cardText || res.j.error || "Veem did not accept that.";
      if (!res.r.ok || !res.j.ok) $("v-err").textContent = res.j.error || "Veem production is not open.";
    });

    (async function boot(){
      const res = await api("/session");
      if (res.j.ok && res.j.user){ user=res.j.user; greet(user.name); paintTools(user.tools); show("app"); openMod("home"); loadCrm(); }
      else show("login");
    })();
  </script>
</body>
</html>`;
}
