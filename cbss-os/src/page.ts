import { BRAND, SALES_SPARKS, TEAM_OWNERS } from "./brand.ts";

export function pageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="${BRAND.navy}" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="The Yard" />
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
    html { -webkit-text-size-adjust: 100%; }
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
    .picks.big button { min-width: 72px; padding: 12px 14px; }
    .step { margin-top: 12px; }
    .step-head { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%; background: var(--navy); color: var(--gold);
      display: grid; place-items: center; font-weight: 700; font-size: 13px; flex-shrink: 0;
    }
    .step-head h2 { margin: 0; }
    .step-head .muted { margin: 3px 0 0; }
    .quote-ticket {
      margin-top: 12px; background: var(--navy); color: #fff; border: 1px solid var(--gold);
      border-radius: 12px; padding: 14px 16px;
    }
    .quote-ticket .kicker { color: var(--gold); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
    .quote-ticket .cash { font-size: 28px; margin: 6px 0 0; font-family: "Times New Roman", Times, serif; color: #fff; }
    .quote-ticket .muted { color: #9eb0c4; margin: 6px 0 0; }
    .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .tabs button { background: #fff; color: var(--navy); border: 1px solid var(--line); }
    .tabs button.on { background: var(--navy); color: #fff; }
    .ai-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .ai-mark {
      width: 42px; height: 42px; border-radius: 10px; background: var(--navy); color: var(--gold);
      display: grid; place-items: center; font-family: "Times New Roman", Times, serif; font-weight: 700; flex-shrink: 0;
    }
    .ai-head h2 { margin: 0; }
    .ai-head .muted { margin: 3px 0 0; }
    .log { display: flex; flex-direction: column; gap: 8px; min-height: 28vh; max-height: 46vh; overflow: auto; background: #f4f7fa; border-radius: 8px; padding: 12px; }
    .bubble { max-width: 92%; padding: 9px 11px; border-radius: 10px; line-height: 1.4; white-space: pre-wrap; }
    .me { align-self: flex-end; background: #e8f0f7; }
    .bot { align-self: flex-start; background: #e8f5ee; border: 1px solid #c8e4d4; }
    .composer { display: flex; gap: 8px; align-items: flex-end; margin-top: 10px; }
    .composer textarea { min-height: 48px; resize: vertical; }
    .comp-bar { display: flex; gap: 8px; align-items: flex-end; margin: 10px 0 0; flex-wrap: wrap; }
    .comp-bar .zip-wrap { flex: 0 0 132px; }
    .comp-bar .zip-wrap label { margin-top: 0; }
    .comp-picks .lbl { font-size: 12px; font-weight: 700; color: #3d4d5c; margin: 8px 0 5px; }
    .comp-picks .btns { display: flex; flex-wrap: wrap; gap: 6px; }
    .comp-picks .pick { background: #fff; color: var(--navy); border: 1px solid var(--line); padding: 7px 10px; }
    .comp-picks .pick.on { background: var(--navy); color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--line); }
    tr.sel td { background: #FBF6E8; }
    .stat { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; margin: 0 0 12px; }
    .stat strong { color: var(--navy); }
    .board { display: grid; grid-template-columns: repeat(8, minmax(210px, 1fr)); gap: 10px; overflow-x: auto; padding-bottom: 8px; }
    .col { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px; min-height: 280px; min-width: 210px; }
    .col h3 { margin: 0 0 8px; font-size: 12px; color: var(--gold); letter-spacing: .04em; display: flex; justify-content: space-between; gap: 8px; }
    .col h3 em { font-style: normal; background: var(--navy); color: #fff; border-radius: 999px; padding: 1px 8px; font-size: 11px; }
    .pc { border: 1px solid var(--line); border-radius: 8px; padding: 8px; margin: 0 0 8px; background: var(--paper); }
    .pc-name { font-weight: 700; color: var(--navy); }
    .pc-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 12px; }
    .pc-amt { font-weight: 700; color: var(--navy); }
    .work-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .sched-box { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(11,31,58,.12); }
    .sched-box input { width: 100%; margin-top: 6px; }
    .acts { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 12px; }
    .acts a, .acts button { text-decoration: none; display: inline-flex; align-items: center; }
    .acts a { background: var(--navy); color: #fff; }
    .acts a.gold { background: var(--gold); color: var(--navy); }
    .acts a.secondary { background: #fff; color: var(--navy); border: 1px solid var(--line); }
    .note { border-bottom: 1px dashed var(--line); padding: 8px 0; font-size: 13px; }
    .hits { border: 1px solid var(--line); border-radius: 8px; }
    .hit { padding: 10px 11px; border-bottom: 1px solid var(--line); }
    .hit:last-child { border-bottom: 0; }
    .outbox { white-space: pre-wrap; background: #f7fafc; border: 1px dashed var(--line); border-radius: 8px; padding: 11px; min-height: 4em; font-size: 14px; }
    .warn { background: #FBF6E8; border: 1px solid #e3d7a8; border-radius: 8px; padding: 10px; font-size: 13px; }
    .spark {
      margin-top: 14px; background: var(--navy); color: #fff; border: 1px solid var(--gold);
      border-radius: 12px; padding: 14px 16px; cursor: pointer; user-select: none;
    }
    .spark .kicker { color: var(--gold); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
    .spark p { margin: 8px 0 0; font-size: 17px; line-height: 1.35; font-family: "Times New Roman", Times, serif; color: #fff; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--line); border-radius: 999px; padding: 4px 9px; font-size: 11px; background: #fff; color: var(--navy); }
    .chip.on { background: #e8f5ee; border-color: #c8e4d4; }
    .chip.off { background: #f8ecec; border-color: #e4c8c8; }
    .login-wrap { min-height: 100%; display: grid; place-items: center; padding: 24px 14px; }
    .login-card { width: min(460px, 100%); }
    .login-card .seal { margin-bottom: 12px; }
    footer { margin-top: 16px; color: var(--muted); font-size: 11px; }
    .gate { display: contents; }
    .table-scroll { overflow: auto; }
    .scroll-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    @media (max-width: 860px) {
      html, body { height: auto; min-height: 100%; }
      body { padding-bottom: env(safe-area-inset-bottom); }
      .shell { grid-template-columns: 1fr; min-height: 100dvh; }
      aside {
        position: sticky; top: 0; z-index: 30;
        padding: 10px 12px 8px; padding-top: max(10px, env(safe-area-inset-top));
        gap: 10px;
      }
      .brand-lock { display: flex; align-items: center; gap: 10px; }
      .seal { width: 40px; height: 40px; font-size: 16px; flex-shrink: 0; }
      aside .live { display: none; }
      nav {
        flex-direction: row; flex-wrap: nowrap; overflow-x: auto; gap: 6px;
        -webkit-overflow-scrolling: touch; scrollbar-width: none;
      }
      nav::-webkit-scrollbar { display: none; }
      nav button { flex: 1 0 auto; min-height: 44px; padding: 10px 12px; text-align: center; }
      header { padding: 10px 12px; }
      header .sub { display: none; }
      .who { max-width: 46vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      main { padding: 12px 12px 28px; }
      h1 { font-size: 22px; }
      .split, .split3, .tiles, .book-split { grid-template-columns: 1fr; }
      .tile { min-height: 0; }
      .scroll-row {
        flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;
        margin-top: 0; padding-bottom: 4px;
      }
      .scroll-row button { flex: 0 0 auto; }
      button, .acts a, .picks button, .comp-picks .pick, .tabs button { min-height: 44px; }
      input, textarea, select { font-size: 16px; }
      .log { min-height: 34vh; max-height: 40vh; }
      .composer { flex-direction: column; align-items: stretch; }
      .composer button { width: 100%; }
      .comp-bar { flex-direction: column; align-items: stretch; }
      .comp-bar .zip-wrap { flex: 1 1 auto; width: 100%; }
      .comp-bar button { width: 100%; }
      .board {
        display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch; gap: 10px; padding-bottom: 12px;
      }
      .col {
        min-width: min(78vw, 280px); max-width: 280px; flex: 0 0 auto;
        scroll-snap-align: start; min-height: 220px;
      }
      .phone-hide { display: none; }
      .table-scroll { -webkit-overflow-scrolling: touch; }
      #crm-followups, #crm-tasks, #crm-campaign { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .acts a, .acts button { padding: 10px 14px; }
      .spark p { font-size: 16px; }
      .quote-ticket .cash { font-size: 24px; }
      .picks.big button { min-width: 0; flex: 1 1 auto; }
      .login-wrap { padding: 24px 14px; padding-top: max(24px, env(safe-area-inset-top)); }
      #crm-detail { scroll-margin-top: 12px; }
    }
  </style>
</head>
<body>
  <div id="login" class="login-wrap">
    <section class="card login-card">
      <div class="seal">CB</div>
      <h1>The Yard</h1>
      <p class="muted">The CB Shipping Solutions house tool. One login for CRM, Desk, Proposal, and Money. Company email only. Same password as the CRM. Bookmark this page.</p>
      <form id="login-form">
        <label for="email">Company email</label>
        <input id="email" type="email" autocomplete="username" placeholder="you@cbshippingsolutions.com" required />
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" required />
        <div class="row"><button type="submit" class="gold">Open The Yard</button></div>
        <p class="err" id="login-err"></p>
      </form>
    </section>
  </div>

  <div id="app" class="shell hide">
    <aside>
      <div class="brand-lock">
        <div class="seal">CB</div>
        <div>
          <div class="brand">CB SHIPPING SOLUTIONS</div>
          <div class="sub" id="stamp">${BRAND.stamp}</div>
          <p class="live">The Yard. One login for the whole desk.</p>
        </div>
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
          <div class="brand">THE YARD</div>
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
          <p class="muted">This is The Yard. Sign in once. Work CRM, Desk, Proposal, and Money from here.</p>
          <div class="chips" id="tool-chips"></div>
          <div class="tiles" style="margin-top:14px">
            <div class="card tile" data-go="crm"><div class="kicker">Book</div><h2>CRM</h2><p class="muted">Contacts, follow-ups, tasks, pipeline, notes.</p></div>
            <div class="card tile" data-go="desk"><div class="kicker">Assist</div><h2>Desk</h2><p class="muted">Your CBSS AI — built for every CB Shipping Solutions employee. Ask it. Then go close.</p></div>
            <div class="card tile" data-go="proposal"><div class="kicker">Quote</div><h2>Proposal</h2><p class="muted">Build the quote. Send the proposal. Put the deal in writing before they cool off.</p></div>
            <div class="card tile" data-go="money"><div class="kicker">Collect</div><h2>Money</h2><p class="muted">Invoice the cash they agreed to. ACH, wire, or card — get it in the account.</p></div>
          </div>
          <div class="spark" id="sales-spark" title="Tap for another">
            <div class="kicker">On the floor</div>
            <p id="sales-spark-line"></p>
          </div>
        </section>

        <section id="mod-crm" class="hide">
          <div class="stat" id="crm-stat"></div>
          <div class="split" style="margin-bottom:10px">
            <div><label>Search</label><input id="crm-q" placeholder="Name, phone, city, company" /></div>
            <div>
              <label>Owner</label>
              <select id="crm-owner">
                <option value="">All owners</option>
                <option value="__mine__">Mine</option>
                <option value="New/Unassigned">New/Unassigned</option>
              </select>
            </div>
          </div>
          <div class="scroll-row" style="margin-top:0">
            <button type="button" class="gold" data-crm="contacts">Contacts</button>
            <button type="button" class="secondary" data-crm="followups">Follow-ups</button>
            <button type="button" class="secondary" data-crm="tasks">Tasks</button>
            <button type="button" class="secondary" data-crm="pipeline">Pipeline</button>
            <button type="button" class="secondary" data-crm="campaign">Email campaign</button>
          </div>
          <div class="card" style="margin-top:12px">
            <div id="crm-contacts">
              <div class="split book-split">
                <div class="table-scroll">
                  <p class="muted" id="crm-list-note"></p>
                  <table><thead><tr><th>Name</th><th class="phone-hide">Company</th><th class="phone-hide">City</th><th>Owner</th><th>Stage</th></tr></thead><tbody id="crm-rows"></tbody></table>
                </div>
                <div id="crm-detail"><p class="muted">Select a contact to view details</p></div>
              </div>
            </div>
            <div id="crm-followups" class="hide"></div>
            <div id="crm-tasks" class="hide"></div>
            <div id="crm-pipeline" class="hide"></div>
            <div id="crm-campaign" class="hide"></div>
            <p class="err" id="crm-err"></p>
          </div>
        </section>

        <section id="mod-desk" class="hide">
          <div class="tabs" id="desk-tabs">
            <button type="button" class="on" data-desk="chat">CBSS AI</button>
            <button type="button" data-desk="call">Call</button>
            <button type="button" data-desk="email">Email templates</button>
          </div>
          <div id="desk-chat" class="card" style="margin-top:12px">
            <div class="ai-head">
              <div class="ai-mark">AI</div>
              <div>
                <h2>CBSS AI for Sales</h2>
                <p class="muted">Your closer-assistant. I will not invent a price. Pick size, grade, and configuration, then pull Container One or USA Containers for the client ZIP. Those numbers are theirs, not a CBSS quote.</p>
              </div>
            </div>
            <div class="log" id="desk-log"></div>
            <div class="comp-picks" id="comp-picks">
              <div class="lbl">Size</div>
              <div class="btns">
                <button type="button" class="pick" data-pick="size" data-val="20STD">20STD</button>
                <button type="button" class="pick" data-pick="size" data-val="20HC">20HC</button>
                <button type="button" class="pick" data-pick="size" data-val="40STD">40STD</button>
                <button type="button" class="pick on" data-pick="size" data-val="40HC">40HC</button>
              </div>
              <div class="lbl">Grade</div>
              <div class="btns">
                <button type="button" class="pick" data-pick="grade" data-val="WWT">WWT</button>
                <button type="button" class="pick on" data-pick="grade" data-val="CW">CW</button>
                <button type="button" class="pick" data-pick="grade" data-val="Economy">Economy</button>
                <button type="button" class="pick" data-pick="grade" data-val="Multi-Trip">Multi-Trip</button>
                <button type="button" class="pick" data-pick="grade" data-val="One-Trip">One-Trip</button>
              </div>
              <div class="lbl">Configuration</div>
              <div class="btns">
                <button type="button" class="pick on" data-pick="config" data-val="Standard">Standard</button>
                <button type="button" class="pick" data-pick="config" data-val="Double door">Double door</button>
                <button type="button" class="pick" data-pick="config" data-val="Side door">Side door</button>
                <button type="button" class="pick" data-pick="config" data-val="Reefer working">Reefer working</button>
                <button type="button" class="pick" data-pick="config" data-val="Reefer non-working">Reefer non-working</button>
              </div>
            </div>
            <div class="comp-bar">
              <div class="zip-wrap"><label for="comp-zip">Client ZIP</label><input id="comp-zip" inputmode="numeric" maxlength="10" placeholder="85001" /></div>
              <button type="button" class="secondary" id="comp-pull">Pull Container One</button>
              <button type="button" class="secondary" id="comp-pull-usa">Pull USA Containers</button>
            </div>
            <form id="desk-ask-form">
              <div class="composer">
                <textarea id="desk-ai" rows="2" placeholder="Ask your CBSS AI for Sales…"></textarea>
                <button type="submit" class="gold">Ask CBSS AI</button>
              </div>
              <p class="err" id="desk-chat-err"></p>
            </form>
          </div>
          <div id="desk-call" class="card hide" style="margin-top:12px">
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
          <div id="desk-email" class="card hide" style="margin-top:12px">
            <h2>Email templates</h2>
            <p class="muted">This tool does not send from Gmail. Copy or open Gmail, then save sent to CRM.</p>
            <select id="desk-tpl"></select>
            <div class="row">
              <button type="button" class="secondary" id="desk-render">Fill template</button>
              <button type="button" class="secondary" id="desk-copy">Copy</button>
            </div>
            <div class="outbox" id="desk-body">Pick a template.</div>
          </div>
        </section>

        <section id="mod-proposal" class="hide">
          <div class="card">
            <div class="ai-head">
              <div class="ai-mark">Q</div>
              <div>
                <h2>Write the proposal</h2>
                <p class="muted">Proposal Builder · one depot. Posted xChange wholesale only. Do not invent a price.</p>
              </div>
            </div>
            <div class="warn">Side door OS 2D ≠ Side door OS 4D ≠ Full open side. OS 2D, OS 4D, and Full open side are different boxes — do not mix them. Pick the exact config the yard posted.</div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">1</div>
              <div>
                <h2>Pick the box</h2>
                <p class="muted">Size, height, door type, and grade. The posted book has to match this exact box.</p>
              </div>
            </div>
            <label>Size</label>
            <div class="picks big" id="p-size"></div>
            <label>Height</label>
            <div class="picks big" id="p-height"></div>
            <label>Config</label>
            <div class="picks big" id="p-config"></div>
            <label>Grade</label>
            <div class="picks big" id="p-grade"></div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">2</div>
              <div>
                <h2>Client ZIP</h2>
                <p class="muted">Wholesale comes from the nearest city that posted that exact box. Fail closed if nobody posted it.</p>
              </div>
            </div>
            <div class="comp-bar">
              <div class="zip-wrap"><label for="p-zip">Client ZIP</label><input id="p-zip" inputmode="numeric" maxlength="5" placeholder="85001" /></div>
              <div class="zip-wrap"><label for="p-qty">Qty</label><input id="p-qty" inputmode="numeric" value="1" /></div>
              <button type="button" class="secondary" id="p-pull">Pull xChange</button>
              <button type="button" class="gold" id="p-match">Get CBSS Price</button>
            </div>
            <p class="muted" id="p-status">Type the client ZIP, pick the exact box, then Get CBSS Price. The yard’s posted wholesale stays theirs. Our proposal amount is what we send.</p>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">3</div>
              <div>
                <h2>Proposal amount</h2>
                <p class="muted">Posted wholesale + live delivery + typed margin, rounded up to $25. That is what we send. Do not invent a wholesale.</p>
              </div>
            </div>
            <div class="split">
              <div>
                <label>Fulfillment</label>
                <select id="p-ful"><option value="deliver">Delivered</option><option value="pickup">Picked up</option></select>
              </div>
              <div><label>Net margin (min $300)</label><input id="p-margin" inputmode="decimal" value="700" /></div>
            </div>
            <div class="split">
              <div>
                <label>Posted wholesale (do not invent)</label>
                <input id="p-wholesale" inputmode="decimal" placeholder="Blank unless xChange posted it" readonly />
              </div>
              <div>
                <label>Proposal each</label>
                <input id="p-cash" inputmode="decimal" placeholder="Posted wholesale + delivery + margin" readonly />
              </div>
            </div>
            <div class="quote-ticket hide" id="p-ticket">
              <div class="kicker">Proposal each</div>
              <p class="cash" id="p-ticket-cash">—</p>
              <p class="muted" id="p-ticket-meta"></p>
            </div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">4</div>
              <div>
                <h2>Who it is for</h2>
                <p class="muted">Put the customer on the proposal while the yes is still warm.</p>
              </div>
            </div>
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
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">5</div>
              <div>
                <h2>Send it</h2>
                <p class="muted">Needs a posted wholesale. This writes the proposal. It does not invent a number.</p>
              </div>
            </div>
            <div class="row"><button type="button" class="gold" id="p-send">Submit proposal</button></div>
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
        </section>
        <footer>${BRAND.company} · The Yard</footer>
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
    const TEAM = ${JSON.stringify(TEAM_OWNERS)};
    const SPARKS = ${JSON.stringify(SALES_SPARKS)};
    let user = null, book = null, selected = null, deskContact = null, lastGmail = "", pick = {size:"40",height:"HC",config:"standard",grade:"CW"};
    let lastQuote = null;
    let campaignIds = {};
    let offers = [];
    let chatHistory = [];
    let compPick = { size:"40HC", grade:"CW", config:"Standard" };
    let deskSeeded = false;

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
      const order = [["crm","CRM"],["desk","Desk"],["proposal","Proposal"],["invoice","Invoice"]];
      $("tool-chips").innerHTML = order.map(function(row){
        const on = tools && tools[row[0]];
        return '<span class="chip '+(on?"on":"off")+'">'+row[1]+" "+(on?"connected":"not signed in")+"</span>";
      }).join("");
    }
    function openMod(mod){
      document.querySelectorAll("#nav [data-mod]").forEach(function(b){ b.classList.toggle("on", b.dataset.mod===mod); });
      ["home","crm","desk","proposal","money"].forEach(function(m){ $("mod-"+m).classList.toggle("hide", m!==mod); });
      if (mod==="desk") { openDesk("chat"); loadTemplates(); seedAsk(); }
      if (mod==="money") loadInvoices();
      if (mod==="home") paintSpark();
    }
    let sparkAt = Math.floor(Math.random()*SPARKS.length);
    function paintSpark(){
      if (!SPARKS.length) return;
      $("sales-spark-line").textContent = SPARKS[sparkAt % SPARKS.length];
    }
    function nextSpark(){
      sparkAt = (sparkAt + 1) % SPARKS.length;
      paintSpark();
    }
    $("sales-spark").addEventListener("click", nextSpark);
    setInterval(nextSpark, 9000);
    paintSpark();
    async function api(path, opt){
      const r = await fetch(path, Object.assign({ credentials:"same-origin", headers:{ "Content-Type":"application/json" } }, opt||{}));
      const j = await r.json().catch(function(){ return {}; });
      if (r.status===401){ show("login"); throw new Error("Sign in first."); }
      return { r:r, j:j };
    }
    function money(n){ return "$" + Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function displayAmount(v){
      if (v===undefined || v===null || v==="") return "";
      const n = typeof v==="number" ? v : parseFloat(String(v).replace(/[$,]/g,""));
      if (!Number.isFinite(n) || n===0) return "";
      return "$" + n.toLocaleString("en-US",{maximumFractionDigits:2});
    }
    function titleOwner(s){
      const raw = String(s||"").trim().replace(/\\s+/g," ");
      if (!raw) return "";
      const compact = raw.toLowerCase().replace(/[\\s_-]+/g,"");
      if (compact==="new/unassigned" || compact==="newunassigned" || compact==="unassigned") return "New/Unassigned";
      const map = { christopher:"Christopher Banks", james:"James", bryan:"Bryan Reese", matthew:"Matthew Brent", veeka:"Kawika Pangelinan", veek:"Kawika Pangelinan", aliyah:"Aliyah", brittni:"Brittni Keeling", derrek:"Derrek Clements" };
      const first = raw.split(/[\\s@]/)[0].toLowerCase();
      return map[first] || raw;
    }
    function mineName(){ return titleOwner((user && (user.name||user.email))||""); }

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
        ["contacts","followups","tasks","pipeline","campaign"].forEach(function(v){ $("crm-"+v).classList.toggle("hide", v!==btn.dataset.crm); });
        if (btn.dataset.crm==="followups") renderFollowups();
        if (btn.dataset.crm==="tasks") renderTasks();
        if (btn.dataset.crm==="pipeline") renderPipeline();
        if (btn.dataset.crm==="campaign") renderCampaign();
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
      contacts.forEach(function(c){
        const fu = (j.followups||{})[c.id] || (j.followups||{})[String(c.id)];
        if (fu && !fu.completed){
          if (fu.nextAction) c.nextAction = fu.nextAction;
          if (fu.followUpDate) c.followUpDate = fu.followUpDate;
        }
        c.owner = titleOwner(c.owner);
        const done = (j.completedTasks||{})[c.id] || (j.completedTasks||{})[String(c.id)];
        c.completedTasks = Array.isArray(done) ? done.slice() : [];
      });
      const deals = (j.deals||[]).map(function(d){ d.owner = titleOwner(d.owner); if (d.stage==="Quoted") d.stage="Quote"; return d; });
      book = { contacts:contacts, deals:deals, followups:j.followups||{}, completed:j.completedTasks||{} };
      $("crm-err").textContent = "";
      await loadCampaign();
      fillOwners(); renderStats(); renderContacts();
    }
    async function loadCampaign(){
      const res = await api("/campaign");
      campaignIds = {};
      (res.j.items||[]).forEach(function(row){ campaignIds[String(row.id)] = row; });
    }
    let ownerReady = false;
    function fillOwners(){
      const skip = { Ivyanna:true };
      const names = new Set(TEAM);
      ((book&&book.contacts)||[]).forEach(function(c){ const o = titleOwner(c.owner); if (o && !skip[o]) names.add(o); });
      ((book&&book.deals)||[]).forEach(function(d){ const o = titleOwner(d.owner); if (o && !skip[o]) names.add(o); });
      const current = $("crm-owner").value;
      const extras = Array.from(names).filter(function(n){ return n!=="New/Unassigned"; }).sort();
      $("crm-owner").innerHTML = '<option value="">All owners</option><option value="__mine__">Mine</option>'
        + extras.map(function(n){ return '<option value="'+esc(n)+'">'+esc(n)+"</option>"; }).join("")
        + '<option value="New/Unassigned">New/Unassigned</option>';
      if (!ownerReady) {
        $("crm-owner").value = "__mine__";
        ownerReady = true;
      } else if (Array.from($("crm-owner").options).some(function(o){ return o.value===current; })) {
        $("crm-owner").value = current;
      }
    }
    function ownerScope(owner){
      const want = $("crm-owner").value;
      const named = titleOwner(owner);
      if (!want) return true;
      if (want==="__mine__") return named===mineName() || String(owner||"").toLowerCase().indexOf(String((user&&user.name)||"").toLowerCase())>=0;
      return named===want;
    }
    function onCampaign(id){ return Boolean(campaignIds[String(id)]); }
    function working(){ return ((book&&book.contacts)||[]).filter(function(c){ return !c.archived && c.status!=="DNC" && !onCampaign(c.id); }); }
    function scopedContacts(){ return working().filter(function(c){ return ownerScope(c.owner); }); }
    function renderStats(){
      if (!book) return;
      const w = scopedContacts();
      const due = openWorkRows().length;
      $("crm-stat").innerHTML = "<span><strong>"+w.length+"</strong> working</span><span><strong>"+scopedDeals().length+"</strong> deals</span><span><strong>"+due+"</strong> follow-ups</span>";
    }
    function filtered(){
      const q = $("crm-q").value.trim().toLowerCase();
      const rows = scopedContacts().filter(function(c){
        if (!q) return true;
        return [c.name,c.company,c.phone,c.city,c.email,c.owner].join(" ").toLowerCase().indexOf(q)>=0;
      });
      const cap = q ? 400 : 200;
      return { rows: rows.slice(0, cap), total: rows.length, cap: cap };
    }
    function renderContacts(){
      if (!book) return;
      const hit = filtered();
      $("crm-rows").innerHTML = hit.rows.map(function(c){
        return '<tr data-id="'+esc(String(c.id))+'"><td>'+esc(c.name||"")+'</td><td class="phone-hide">'+esc(c.company||"")+'</td><td class="phone-hide">'+esc(c.city||"")+"</td><td>"+esc(c.owner||"")+"</td><td>"+esc(c.status||"")+"</td></tr>";
      }).join("");
      const note = $("crm-list-note");
      if (note) {
        note.textContent = hit.total > hit.rows.length
          ? "Showing "+hit.rows.length+" of "+hit.total+". Search to find anyone."
          : (hit.total ? hit.total+" in this book." : "");
      }
    }
    $("crm-q").addEventListener("input", renderContacts);
    $("crm-owner").addEventListener("change", function(){
      renderStats(); renderContacts();
      if (!$("crm-followups").classList.contains("hide")) renderFollowups();
      if (!$("crm-tasks").classList.contains("hide")) renderTasks();
      if (!$("crm-pipeline").classList.contains("hide")) renderPipeline();
      if (!$("crm-campaign").classList.contains("hide")) renderCampaign();
    });
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
      const digits = String(selected.phone||"").replace(/\\D/g,"");
      const tel = digits.length===11 && digits.charAt(0)==="1" ? digits.slice(1) : digits;
      const mail = String(selected.email||"").trim();
      const gmail = mail ? "https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(mail) : "";
      const callHref = tel.length>=7 ? "tel:+1"+tel : "";
      const textHref = tel.length>=7 ? "sms:+1"+tel : "";
      $("crm-detail").innerHTML = "<h2>"+esc(selected.name||"")+"</h2>"
        +'<p class="muted">'+esc([selected.company,selected.phone,selected.city,selected.state].filter(Boolean).join(" · "))+"</p>"
        +"<p>Owner "+esc(selected.owner||"")+" · "+esc(selected.status||"")+(selected.amount?" · "+money(selected.amount):"")+"</p>"
        +'<div class="acts">'
        +(callHref ? '<a class="gold" href="'+callHref+'">Call</a>' : '<button type="button" class="secondary" disabled title="No phone on this contact">Call</button>')
        +(gmail ? '<a class="secondary" href="'+esc(gmail)+'" target="_blank" rel="noopener">Email</a>' : '<button type="button" class="secondary" disabled title="No email on this contact">Email</button>')
        +(textHref ? '<a class="secondary" href="'+textHref+'">Text</a>' : '<button type="button" class="secondary" disabled title="No phone on this contact">Text</button>')
        +'<button type="button" class="secondary" id="add-campaign">Add to email campaign</button>'
        +"</div>"
        +(fu.pendingNext || fu.completed ? '<p class="muted">Just completed. Type the next follow-up and save it — it stays on the book.</p>' : "")
        +'<label>Follow-up</label><input id="fu-act" value="'+esc(fu.pendingNext || fu.completed ? "" : (fu.nextAction||""))+'" placeholder="e.g. Call about 40ft WWT pricing" />'
        +'<input id="fu-date" type="datetime-local" value="'+esc(fu.pendingNext || fu.completed ? "" : (fu.followUpDate||"").slice(0,16))+'" />'
        +'<div class="row"><button type="button" class="secondary" id="fu-save">Save follow-up</button><button type="button" id="fu-done">Complete</button></div>'
        +'<label>Add note</label><textarea id="note-text" rows="2"></textarea><div class="row"><button type="button" class="secondary" id="note-add">Add note</button></div>'
        +doneTodayHtml(selected)
        +"<div>"+(notes.slice(0,12).map(function(n){ return '<div class="note"><strong>'+esc(n.tag||n.author||"")+"</strong> "+esc(n.timestamp||"")+"<div>"+esc(n.text||"")+"</div></div>"; }).join("")||'<p class="muted">No notes yet.</p>')+"</div>";
      $("fu-save").onclick = saveFollowup;
      $("fu-done").onclick = completeTask;
      $("note-add").onclick = addNote;
      const campBtn = $("add-campaign");
      if (campBtn) campBtn.onclick = addToCampaign;
      if (window.matchMedia("(max-width: 860px)").matches) $("crm-detail").scrollIntoView({ behavior:"smooth", block:"start" });
    }
    function followupStamp(){
      return new Date(Date.now() + 120000).toISOString();
    }
    function followupRow(nextAction, followUpDate){
      return {
        nextAction: String(nextAction||"").trim(),
        followUpDate: String(followUpDate||"").trim(),
        completed: false,
        status: "open",
        updatedAt: followupStamp()
      };
    }
    function setCrmMsg(text, isErr){
      const el = $("crm-err");
      if (!el) return;
      el.textContent = text || "";
      el.style.color = isErr ? "#b42318" : "";
    }
    async function persistOpenFollowup(id, nextAction, followUpDate){
      const row = followupRow(nextAction, followUpDate);
      if (!row.nextAction && !row.followUpDate) return null;
      const patch = {};
      patch[id] = row;
      const edits = {};
      edits[id] = { nextAction: row.nextAction, followUpDate: row.followUpDate };
      const saved = await api("/x/crm/crm-data?action=saveFollowups", { method:"POST", body: JSON.stringify({ action:"saveFollowups", followups: patch }) });
      if (!saved.r.ok || saved.j.ok === false){
        throw new Error((saved.j && saved.j.error) || "Could not save the follow-up.");
      }
      const edited = await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"saveContactEdits", contactEdits: edits }) });
      if (!edited.r.ok || edited.j.ok === false){
        throw new Error((edited.j && edited.j.error) || "Follow-up saved, but the contact card did not update.");
      }
      book.followups[id] = row;
      book.followups[String(id)] = row;
      const c = contactForId(id);
      if (c){ c.nextAction = row.nextAction; c.followUpDate = row.followUpDate; }
      return row;
    }
    async function saveFollowup(){
      if (!selected) return;
      const nextAction = $("fu-act").value;
      const followUpDate = $("fu-date").value;
      if (!String(nextAction||"").trim() && !String(followUpDate||"").trim()){
        setCrmMsg("Type the next action or pick a date, then Save follow-up.", true);
        return;
      }
      try {
        const row = await persistOpenFollowup(selected.id, nextAction, followUpDate);
        if (!row) return;
        setCrmMsg("Follow-up saved. It stays on the book.", false);
        renderStats(); renderFollowups(); renderTasks();
      } catch (err) {
        setCrmMsg((err && err.message) || "Could not save the follow-up.", true);
      }
    }
    async function completeTask(){
      if (!selected) return;
      const prev = $("fu-act").value.trim() || "Follow-up";
      try {
        const doneRes = await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"completeFollowup", contactId:String(selected.id), nextAction:prev }) });
        if (!doneRes.r.ok || doneRes.j.ok === false){
          throw new Error((doneRes.j && doneRes.j.error) || "Could not complete that follow-up.");
        }
        const stamp = new Date().toISOString().slice(0,16).replace("T"," ");
        const doneRow = { text:prev, author:(user&&(user.name||user.email))||"User", timestamp:stamp, status:"completed" };
        book.completed = book.completed || {};
        const prevDone = (book.completed[selected.id] || book.completed[String(selected.id)] || []).slice();
        prevDone.unshift(doneRow);
        book.completed[selected.id] = prevDone;
        selected.completedTasks = prevDone;
        book.followups[selected.id] = { nextAction:"", followUpDate:"", completed:true, status:"completed", pendingNext:true };
        selected.nextAction = "";
        selected.followUpDate = "";
        setCrmMsg("Completed. Type the next follow-up and tap Save follow-up — it stays on the book.", false);
        renderStats(); renderFollowups(); renderTasks(); openContact(selected.id);
      } catch (err) {
        setCrmMsg((err && err.message) || "Could not complete that follow-up.", true);
      }
    }
    async function addNote(){
      if (!selected) return;
      const text = $("note-text").value.trim();
      if (!text) return;
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"appendNote", contactId:String(selected.id), text:text, tag:"Desk" }) });
      openContact(selected.id);
    }
    async function addToCampaign(){
      if (!selected) return;
      const res = await api("/campaign/add", { method:"POST", body: JSON.stringify({
        id:String(selected.id), name:selected.name||"", email:selected.email||"", phone:selected.phone||"",
        city:selected.city||"", owner:selected.owner||""
      }) });
      (res.j.items||[]).forEach(function(row){ campaignIds[String(row.id)] = row; });
      $("crm-detail").innerHTML = '<p class="muted">'+esc(selected.name||"That lead")+" moved to Email campaign. The future campaign tool will work this list.</p>";
      selected = null;
      renderStats(); renderContacts(); renderFollowups(); renderTasks(); renderPipeline(); renderCampaign();
    }
    function renderCampaign(){
      const rows = Object.keys(campaignIds).map(function(id){ return campaignIds[id]; });
      $("crm-campaign").innerHTML = "<h2>Email campaign</h2><p class=\\"muted\\">Leads pulled off the working book for a future campaign tool. They stay in the CRM book. This hold list lives here.</p>"
        +(rows.length ? '<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Owner</th><th></th></tr></thead><tbody>'
          +rows.map(function(row){
            return '<tr><td>'+esc(row.name||"")+"</td><td>"+esc(row.email||"")+"</td><td>"+esc(row.phone||"")+"</td><td>"+esc(row.owner||"")
              +'</td><td><button type="button" class="secondary" data-return="'+esc(String(row.id))+'">Return to book</button></td></tr>';
          }).join("")+"</tbody></table>" : '<p class="muted">No campaign leads yet.</p>');
    }
    $("crm-campaign").addEventListener("click", async function(e){
      const btn = e.target.closest("[data-return]");
      if (!btn) return;
      const id = btn.getAttribute("data-return");
      const res = await api("/campaign/return", { method:"POST", body: JSON.stringify({ id:id }) });
      campaignIds = {};
      (res.j.items||[]).forEach(function(row){ campaignIds[String(row.id)] = row; });
      renderStats(); renderContacts(); renderCampaign();
    });
    function contactForId(id){ return ((book&&book.contacts)||[]).find(function(c){ return String(c.id)===String(id); }); }
    function scopedDeals(){
      return ((book&&book.deals)||[]).filter(function(d){
        const c = contactForId(d.contactId);
        if (c && (c.archived || onCampaign(c.id))) return false;
        if (onCampaign(d.contactId)) return false;
        return ownerScope(d.owner) || (c && ownerScope(c.owner));
      });
    }
    function dealAmount(d){
      const raw = (d && d.amount!=null && d.amount!=="") ? d.amount : "";
      if (raw!=="") return displayAmount(raw);
      const c = contactForId(d && d.contactId);
      return displayAmount(c && c.amount);
    }
    function todayKey(){
      const d = new Date();
      return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    }
    function completedRowsFor(c){
      const fromContact = Array.isArray(c && c.completedTasks) ? c.completedTasks : [];
      const fromBook = ((book&&book.completed)||{})[c && c.id] || ((book&&book.completed)||{})[String(c && c.id)] || [];
      return fromContact.length ? fromContact : (Array.isArray(fromBook) ? fromBook : []);
    }
    function latestDoneToday(c){
      const day = todayKey();
      const hits = completedRowsFor(c).filter(function(t){ return t && String(t.timestamp||"").replace("T"," ").slice(0,10)===day; });
      return hits[0] || null;
    }
    function doneTodayRows(){
      const open = {};
      openWorkRows().forEach(function(c){ open[String(c.id)] = true; });
      return scopedContacts().filter(function(c){
        if (open[String(c.id)]) return false;
        return Boolean(latestDoneToday(c));
      }).sort(function(a,b){
        const ta = String((latestDoneToday(a)||{}).timestamp||"");
        const tb = String((latestDoneToday(b)||{}).timestamp||"");
        return tb.localeCompare(ta);
      });
    }
    function doneTodayHtml(c){
      const rows = completedRowsFor(c).slice(0,8);
      if (!rows.length) return "";
      return "<h3>Completed</h3>"+rows.map(function(t){
        return '<div class="note"><strong>'+esc(t.author||"")+"</strong> "+esc(t.timestamp||"")+"<div>"+esc(t.text||"Follow-up")+"</div></div>";
      }).join("");
    }
    function openWorkRows(){
      return scopedContacts().filter(function(c){
        const f = (book.followups||{})[c.id]||(book.followups||{})[String(c.id)]||{};
        if (f.pendingNext) return true;
        const action = c.nextAction || f.nextAction;
        const when = c.followUpDate || f.followUpDate;
        return !f.completed && (String(action||"").trim() || String(when||"").trim());
      }).sort(function(a,b){
        return String(a.followUpDate||"9999").localeCompare(String(b.followUpDate||"9999"));
      });
    }
    function workRow(c, doneToday){
      const f = (book.followups||{})[c.id]||(book.followups||{})[String(c.id)]||{};
      const pending = !!f.pendingNext || !!doneToday;
      const last = doneToday ? latestDoneToday(c) : null;
      const action = pending ? (last && last.text) || "Completed today" : (c.nextAction || f.nextAction || "");
      const when = pending ? (last && last.timestamp) || "" : (c.followUpDate || f.followUpDate || "").slice(0,16);
      return '<tr data-id="'+esc(String(c.id))+'"><td>'+esc(c.name||"")+"</td><td>"+esc(action)+"</td><td>"+esc(when)+"</td><td>"+esc(c.owner||"")+'</td><td><div class="work-actions">'
        +(pending ? "" : '<button type="button" class="gold" data-done="'+esc(String(c.id))+'">Complete</button>')
        +"</div>"
        +'<div class="sched-box" data-sched-box="'+esc(String(c.id))+'">'
        +'<label>'+(pending ? "Just completed. Set the next follow-up." : "Schedule another")+'</label>'
        +'<input data-next-act="'+esc(String(c.id))+'" placeholder="Next action — e.g. Call this afternoon" autocomplete="off" />'
        +'<input type="datetime-local" data-next-date="'+esc(String(c.id))+'" />'
        +'<div class="row" style="margin-top:6px"><button type="button" class="'+(pending ? "gold" : "secondary")+'" data-sched="'+esc(String(c.id))+'">Save next follow-up</button></div>'
        +"</div></td></tr>";
    }
    function workTable(rows, empty, doneToday){
      if (!rows.length) return '<p class="muted">'+empty+"</p>";
      return '<table><thead><tr><th>Name</th><th>Next action</th><th>Date</th><th>Owner</th><th></th></tr></thead><tbody>'
        +rows.map(function(c){ return workRow(c, doneToday); }).join("")+"</tbody></table>";
    }
    function renderFollowups(){
      const rows = openWorkRows();
      const done = doneTodayRows();
      $("crm-followups").innerHTML = "<h2>Follow-ups</h2><p class=\\"muted\\">Complete one, then type the next call on that same row and tap Save next follow-up. The new follow-up stays on the book. People you finished today stay under Done today — schedule them again from there.</p>"
        +workTable(rows, "No open follow-ups.", false)
        +(done.length ? "<h2>Done today</h2><p class=\\"muted\\">"+done.length+" finished today. Type the next action on their row and tap Save next follow-up — it will move back onto Follow-ups.</p>"+workTable(done, "", true) : "");
    }
    function renderTasks(){
      const rows = openWorkRows();
      const done = doneTodayRows();
      $("crm-tasks").innerHTML = "<h2>Tasks</h2><p class=\\"muted\\">Same book as follow-ups. Complete, then save the next one on that row so it does not disappear.</p>"
        +workTable(rows, "No open tasks.", false)
        +(done.length ? "<h2>Done today</h2><p class=\\"muted\\">"+done.length+" finished today. Save the next follow-up on their row.</p>"+workTable(done, "", true) : "");
    }
    function workFields(id, row){
      const root = row || document;
      const box = (row && row.querySelector && row.querySelector('[data-sched-box="'+id+'"]')) || root;
      const act = box.querySelector ? box.querySelector('[data-next-act="'+id+'"]') : null;
      const when = box.querySelector ? box.querySelector('[data-next-date="'+id+'"]') : null;
      return {
        nextAction: act ? String(act.value || "").trim() : "",
        followUpDate: when ? String(when.value || "").trim() : ""
      };
    }
    function bindWorkLists(root){
      root.addEventListener("click", async function(e){
        const done = e.target.closest("[data-done]");
        const sched = e.target.closest("[data-sched]");
        if (done){
          e.stopPropagation();
          await completeWork(done.getAttribute("data-done"), done.closest("tr"));
          return;
        }
        if (sched){
          e.stopPropagation();
          await scheduleWork(sched.getAttribute("data-sched"), sched.closest("tr"));
          return;
        }
        const tr = e.target.closest("tr[data-id]");
        if (tr && !e.target.closest("button, input, label, select, .sched-box")) {
          const tab = document.querySelector('[data-crm="contacts"]');
          if (tab) tab.click();
          openContact(tr.getAttribute("data-id"));
        }
      });
    }
    bindWorkLists($("crm-followups"));
    bindWorkLists($("crm-tasks"));
    async function completeWork(id, row){
      const c = contactForId(id);
      if (!c) return;
      const fields = workFields(id, row);
      const nextAction = fields.nextAction;
      const followUpDate = fields.followUpDate;
      const f = (book.followups||{})[id]||(book.followups||{})[String(id)]||{};
      const action = c.nextAction || f.nextAction || "Follow-up";
      try {
        const doneRes = await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"completeFollowup", contactId:String(id), nextAction:action }) });
        if (!doneRes.r.ok || doneRes.j.ok === false){
          throw new Error((doneRes.j && doneRes.j.error) || "Could not complete that follow-up.");
        }
        const stamp = new Date().toISOString().slice(0,16).replace("T"," ");
        const doneRow = { text:action, author:(user&&(user.name||user.email))||"User", timestamp:stamp, status:"completed" };
        book.completed = book.completed || {};
        const prevDone = (book.completed[id] || book.completed[String(id)] || []).slice();
        prevDone.unshift(doneRow);
        book.completed[id] = prevDone;
        book.completed[String(id)] = prevDone;
        c.completedTasks = prevDone;
        if (nextAction || followUpDate){
          await persistOpenFollowup(id, nextAction, followUpDate);
          setCrmMsg("Completed and saved the next follow-up.", false);
        } else {
          c.nextAction = ""; c.followUpDate = "";
          book.followups[id] = { nextAction:"", followUpDate:"", completed:true, status:"completed", pendingNext:true };
          book.followups[String(id)] = book.followups[id];
          setCrmMsg("Completed. Type the next action on that row and tap Save next follow-up.", false);
        }
        renderStats(); renderFollowups(); renderTasks();
      } catch (err) {
        setCrmMsg((err && err.message) || "Could not complete that follow-up.", true);
      }
    }
    async function scheduleWork(id, row){
      const fields = workFields(id, row);
      const nextAction = fields.nextAction;
      const followUpDate = fields.followUpDate;
      if (!nextAction && !followUpDate){
        setCrmMsg("Type the next action or pick a date, then Save next follow-up.", true);
        return;
      }
      try {
        await persistOpenFollowup(id, nextAction, followUpDate);
        setCrmMsg("Next follow-up saved. It stays on Follow-ups.", false);
        renderStats(); renderFollowups(); renderTasks();
      } catch (err) {
        setCrmMsg((err && err.message) || "Could not save the next follow-up.", true);
      }
    }
    function renderPipeline(){
      const deals = scopedDeals();
      $("crm-pipeline").innerHTML = '<div class="board">'+STAGES.map(function(st){
        const cards = deals.filter(function(d){ return (d.stage||"")===st || (st==="Quote"&&d.stage==="Quoted"); });
        const total = cards.reduce(function(sum,d){
          const n = parseFloat(String((d.amount!=null&&d.amount!=="")?d.amount:((contactForId(d.contactId)||{}).amount||"")).replace(/[$,]/g,""));
          return sum + (Number.isFinite(n)?n:0);
        },0);
        return '<div class="col"><h3><span>'+st+"</span><em>"+cards.length+"</em></h3>"
          +(total? '<p class="muted">'+displayAmount(total)+"</p>":"")
          +cards.map(function(d){
            const c = contactForId(d.contactId);
            const name = d.contactName || (c&&c.name) || d.name || "Deal";
            const company = (c&&c.company) || d.company || "";
            const owner = titleOwner(d.owner) || (c&&c.owner) || "";
            const amt = dealAmount(d);
            return '<div class="pc" data-id="'+esc(String(d.contactId||""))+'"><div class="pc-name">'+esc(name)+'</div><div class="muted">'+esc(company||"—")+'</div><div class="pc-meta"><span class="pc-amt">'+(amt||"—")+'</span><span>'+esc(owner||"—")+"</span></div>"
              +'<select data-deal="'+esc(String(d.id))+'">'+STAGES.map(function(s){ return '<option value="'+s+'"'+(s===d.stage?" selected":"")+">"+s+"</option>"; }).join("")+"</select></div>";
          }).join("")+"</div>";
      }).join("")+"</div>";
    }
    $("crm-pipeline").addEventListener("click", function(e){
      const card = e.target.closest(".pc[data-id]");
      if (card && !e.target.closest("select")) openContact(card.getAttribute("data-id"));
    });
    $("crm-pipeline").addEventListener("change", async function(e){
      const sel = e.target.closest("select[data-deal]");
      if (!sel) return;
      const deal = (book.deals||[]).find(function(d){ return String(d.id)===sel.getAttribute("data-deal"); });
      if (!deal) return;
      deal.stage = sel.value;
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"saveDeals", deals: book.deals }) });
      renderStats(); renderPipeline();
    });

    function openDesk(tab){
      document.querySelectorAll("#desk-tabs [data-desk]").forEach(function(b){ b.classList.toggle("on", b.dataset.desk===tab); });
      ["chat","call","email"].forEach(function(t){ $("desk-"+t).classList.toggle("hide", t!==tab); });
    }
    document.querySelectorAll("#desk-tabs [data-desk]").forEach(function(btn){
      btn.addEventListener("click", function(){
        openDesk(btn.dataset.desk);
        if (btn.dataset.desk==="email") loadTemplates();
      });
    });
    function bubble(role, text){
      const div = document.createElement("div");
      div.className = "bubble " + (role==="user"?"me":"bot");
      div.textContent = text;
      $("desk-log").appendChild(div);
      $("desk-log").scrollTop = $("desk-log").scrollHeight;
    }
    function seedAsk(){
      if (deskSeeded) return;
      deskSeeded = true;
      bubble("assistant", "I am your CBSS AI for Sales. Tell me the lead, the call, or what you need written. I will not invent a price. On a call, pick size, grade, and configuration, then pull Container One or USA Containers for the client ZIP. That posted number is theirs, not ours.");
    }
    async function askDesk(text){
      $("desk-chat-err").textContent = "";
      const q = String(text||"").trim();
      if (!q) return;
      bubble("user", q);
      chatHistory.push({ role:"user", content:q });
      $("desk-ai").value = "";
      const res = await api("/x/desk/chat", { method:"POST", body: JSON.stringify({ message:q, history:chatHistory }) });
      const reply = res.j.reply || res.j.text || res.j.error || "No reply.";
      chatHistory.push({ role:"assistant", content:reply });
      bubble("assistant", reply);
    }
    $("desk-ask-form").addEventListener("submit", function(e){ e.preventDefault(); askDesk($("desk-ai").value); });
    document.querySelectorAll("#comp-picks .pick").forEach(function(b){
      b.addEventListener("click", function(){
        const kind = b.getAttribute("data-pick");
        const val = b.getAttribute("data-val");
        if (!kind || !val) return;
        compPick[kind] = val;
        document.querySelectorAll('#comp-picks .pick[data-pick="'+kind+'"]').forEach(function(el){ el.classList.toggle("on", el.getAttribute("data-val")===val); });
      });
    });
    async function pullCompetitor(vendor){
      const zip = $("comp-zip").value.trim();
      if (!zip){ $("desk-chat-err").textContent = "Type the client ZIP first."; return; }
      const who = vendor==="usa-containers" ? "USA Containers" : "Container One";
      const path = vendor==="usa-containers" ? "/x/desk/comp/usa-containers" : "/x/desk/comp/container-one";
      bubble("user", "Pull "+who+" for ZIP "+zip+" — "+compPick.size+" "+compPick.grade+" "+compPick.config);
      const res = await api(path, { method:"POST", body: JSON.stringify({ zip:zip, size:compPick.size, grade:compPick.grade, config:compPick.config }) });
      const reply = res.j.reply || res.j.error || "Could not pull that posted price. Do not invent a number.";
      bubble("assistant", reply);
      chatHistory.push({ role:"user", content:"Pull "+who+" "+zip+" "+compPick.size+" "+compPick.grade+" "+compPick.config });
      chatHistory.push({ role:"assistant", content:reply });
    }
    $("comp-pull").addEventListener("click", function(){ pullCompetitor("container-one"); });
    $("comp-pull-usa").addEventListener("click", function(){ pullCompetitor("usa-containers"); });
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

    function sizeToken(){
      if (pick.config && pick.config!=="standard") return "Specialized";
      if (pick.size==="20" || pick.size==="10") return "20ft";
      if (pick.size==="40" || pick.size==="45") return "40ft";
      return "Specialized";
    }
    function applyQuoteMatch(j){
      lastQuote = j && j.ok ? j : null;
      if (!j || !j.ok){
        $("p-wholesale").value = "";
        $("p-cash").value = "";
        $("p-ticket").classList.add("hide");
        $("p-ticket-cash").textContent = "—";
        $("p-ticket-meta").textContent = "";
        $("p-status").textContent = (j && (j.error||j.message)) || "No matching posted box. Do not invent a wholesale.";
        return;
      }
      $("p-wholesale").value = String(j.wholesale);
      const delivery = $("p-ful").value==="pickup" ? 0 : Number(j.delivery||0);
      const margin = Math.max(300, Number($("p-margin").value)||700);
      const cash = Math.ceil((Number(j.wholesale)+delivery+margin)/25)*25;
      $("p-cash").value = String(cash);
      if (!$("p-del").value && j.place) $("p-del").value = j.place;
      const skip = j.skippedCity ? " "+j.skippedCity+" did not post this box." : "";
      const line = (j.place||"ZIP")+" · depot "+(j.city||"?")+(j.miles!=null?" · "+j.miles+" miles":"")
        +" · "+(j.size||"")+" · "+(j.condition||"")+" · posted "+money(j.wholesale)+" · qty "+(j.qty||"?")+"."
        +skip+" That number is theirs, not a CBSS quote.";
      $("p-status").textContent = line;
      $("p-ticket").classList.remove("hide");
      $("p-ticket-cash").textContent = money(cash);
      $("p-ticket-meta").textContent = (j.place||"ZIP")+" · depot "+(j.city||"?")+(j.miles!=null?" · "+j.miles+" mi":"")
        +" · posted "+money(j.wholesale)+(delivery?" · delivery "+money(delivery):" · pickup")+" · margin "+money(margin);
    }
    async function quoteMatch(refresh){
      const zip = String($("p-zip").value||"").replace(/\\D/g,"").slice(0,5);
      if (zip.length!==5){ $("p-status").textContent = "Type a 5-digit client ZIP first."; return; }
      $("p-pull").disabled = true; $("p-match").disabled = true;
      $("p-status").textContent = refresh ? "Pulling posted xChange book for that ZIP…" : "Getting the CBSS price for that ZIP…";
      try {
        const res = await api("/quote/match", { method:"POST", body: JSON.stringify({
          zip:zip, size:pick.size, height:pick.height, config:pick.config, grade:pick.grade,
          qty:$("p-qty").value, fulfillment:$("p-ful").value, refresh:refresh
        }) });
        applyQuoteMatch(res.j);
      } catch (err) {
        $("p-status").textContent = "Could not match that ZIP to a posted box. Do not invent a wholesale.";
      }
      $("p-pull").disabled = false; $("p-match").disabled = false;
    }
    $("p-pull").addEventListener("click", function(){ quoteMatch(true); });
    $("p-match").addEventListener("click", function(){ quoteMatch(false); });
    function recastCash(){ if (lastQuote && lastQuote.ok) applyQuoteMatch(lastQuote); }
    $("p-margin").addEventListener("change", recastCash);
    $("p-ful").addEventListener("change", recastCash);
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
        repName: user && user.name, repEmail: user && user.email,
        depot: lastQuote && lastQuote.depot, depotCity: lastQuote && lastQuote.city,
        region: lastQuote && lastQuote.region, miles: lastQuote && lastQuote.miles,
        deliveryCost: lastQuote && $("p-ful").value==="pickup" ? 0 : (lastQuote && lastQuote.delivery)
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

    (async function boot(){
      const res = await api("/session");
      if (res.j.ok && res.j.user){ user=res.j.user; greet(user.name); paintTools(user.tools); show("app"); openMod("home"); loadCrm(); }
      else show("login");
    })();
  </script>
</body>
</html>`;
}
