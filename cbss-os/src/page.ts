import { BRAND, OWNER_ALIASES, SALES_SPARKS, TEAM_OWNERS, YARD_PUBLIC } from "./brand.ts";
import { CONTACT_CHANGE_LABELS } from "./contact-log.ts";
import { MODIFIED_CATEGORIES, MODIFIED_ITEMS, MODIFIED_USES } from "./modified-catalog.ts";

function htmlEsc(value: string): string {
  return String(value || "").replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c] || c;
  });
}

export function pageHtml(opts: { loginError?: string } = {}): string {
  const loginError = htmlEsc(opts.loginError || "");
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
    html, body {
      margin: 0;
      min-height: 100%;
      min-height: 100dvh;
      min-height: -webkit-fill-available;
    }
    body { font-family: Helvetica, Arial, "Segoe UI", sans-serif; background: var(--paper); color: var(--ink); font-size: 15px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .shell {
      min-height: 100%;
      min-height: 100dvh;
      min-height: -webkit-fill-available;
      display: grid;
      grid-template-columns: 232px 1fr;
    }
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
    .save-flash {
      background: #0b3d24; color: #fff; border: 3px solid var(--gold); border-radius: 12px;
      padding: 16px 18px; margin: 0 0 16px; scroll-margin-top: 16px;
    }
    .save-flash .kicker, .save-alert .kicker {
      color: var(--gold); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; font-weight: 800; margin: 0;
    }
    .save-flash h3, .save-alert h3 {
      margin: 6px 0 0; color: #fff; font-size: 24px; letter-spacing: 0;
      font-family: "Times New Roman", Times, serif;
    }
    .save-flash p, .save-alert p { margin: 8px 0 0; color: #d7efe3; font-size: 16px; font-weight: 650; }
    .save-alert {
      position: fixed; inset: 0; z-index: 95; background: rgba(11,31,58,.68);
      display: flex; align-items: center; justify-content: center; padding: 18px;
    }
    .save-alert .box {
      width: min(500px, 100%); background: #0b3d24; color: #fff;
      border: 4px solid var(--gold); border-radius: 14px; padding: 24px 22px 20px;
      box-shadow: 0 18px 48px rgba(0,0,0,.4); animation: save-pop .18s ease-out;
    }
    .save-alert .row { margin-top: 16px; }
    .save-alert button { min-height: 46px; min-width: 120px; font-size: 16px; }
    @keyframes save-pop {
      from { transform: scale(.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-back { position: fixed; inset: 0; background: rgba(11,31,58,.45); z-index: 80; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 18px; width: min(520px, 100%); max-height: 90vh; overflow: auto; }
    .stage-chip { display: inline-block; background: #e8f0f7; border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px; font-size: 12px; font-weight: 700; color: var(--navy); }
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
    .mod-item {
      display: grid; grid-template-columns: auto 1fr 72px; gap: 10px; align-items: start;
      padding: 10px 8px; border-bottom: 1px solid var(--line);
    }
    .mod-item:last-child { border-bottom: 0; }
    .mod-item.on { background: #FBF6E8; border-radius: 8px; border-bottom-color: transparent; }
    .mod-item input[type="checkbox"] { width: auto; margin-top: 4px; }
    .mod-item .name { font-weight: 700; color: var(--navy); }
    .mod-item .spec { color: var(--muted); font-size: 13px; margin: 3px 0 0; }
    .mod-item input[type="number"] { padding: 7px 8px; }
    .mod-apex { background: #0b1f3a; color: #fff; border: 2px solid var(--gold); border-radius: 12px; padding: 14px 16px; margin: 0 0 12px; }
    .mod-apex .kicker { color: var(--gold); }
    .mod-apex h3 { color: #fff; margin: 4px 0 0; font-size: 20px; letter-spacing: 0; font-family: "Times New Roman", Times, serif; }
    .mod-apex p { color: #d5deea; margin: 8px 0 0; }
    .mod-apex label { color: #d5deea; }
    .mod-apex input { background: #fff; }
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
    .board { display: grid; grid-template-columns: repeat(11, minmax(210px, 1fr)); gap: 10px; overflow-x: auto; padding-bottom: 8px; }
    .col { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px; min-height: 280px; min-width: 210px; }
    .col h3 { margin: 0 0 8px; font-size: 12px; color: var(--gold); letter-spacing: .04em; display: flex; justify-content: space-between; gap: 8px; }
    .col h3 em { font-style: normal; background: var(--navy); color: #fff; border-radius: 999px; padding: 1px 8px; font-size: 11px; }
    .pc { border: 1px solid var(--line); border-radius: 8px; padding: 8px; margin: 0 0 8px; background: var(--paper); }
    .pc-name { font-weight: 700; color: var(--navy); }
    .pc-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 12px; }
    .pc-amt { font-weight: 700; color: var(--navy); }
    .work-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .acts { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 12px; }
    .acts a, .acts button { text-decoration: none; display: inline-flex; align-items: center; }
    .acts a { background: var(--navy); color: #fff; }
    .acts a.gold { background: var(--gold); color: var(--navy); }
    .acts a.secondary { background: #fff; color: var(--navy); border: 1px solid var(--line); }
    .note { border-bottom: 1px dashed var(--line); padding: 8px 0; font-size: 13px; }
    .hits { border: 1px solid var(--line); border-radius: 8px; max-height: 220px; overflow: auto; margin-top: 6px; }
    .hit { display: block; width: 100%; text-align: left; padding: 10px 11px; border: 0; border-bottom: 1px solid var(--line); background: #fff; color: var(--ink); cursor: pointer; font-weight: 500; }
    .hit:last-child { border-bottom: 0; }
    .hit:hover, .hit.on { background: #e8f0f7; }
    button, .hit { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
    .picked { background: #e8f5ee; border: 1px solid #c8e4d4; border-radius: 8px; padding: 9px 11px; margin-top: 8px; font-size: 14px; }
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
    .login-wrap {
      box-sizing: border-box;
      min-height: 100%;
      min-height: 100dvh;
      min-height: -webkit-fill-available;
      display: -webkit-flex;
      display: flex;
      -webkit-align-items: center;
      align-items: center;
      -webkit-justify-content: center;
      justify-content: center;
      padding: 24px 14px;
    }
    .login-card { width: min(460px, 100%); }
    .login-card .seal { margin-bottom: 12px; }
    footer { margin-top: 16px; color: var(--muted); font-size: 11px; }
    .gate { display: contents; }
    .table-scroll { overflow: auto; }
    .scroll-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    @media (max-width: 860px) {
      html, body { height: auto; min-height: 100%; min-height: 100dvh; min-height: -webkit-fill-available; }
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
      button, .hit, .acts a, .picks button, .comp-picks .pick, .tabs button { min-height: 44px; }
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
      .mod-item { grid-template-columns: auto 1fr 64px; }
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
      <p class="muted">CB Shipping Solutions floor CRM. One sign-in for CRM, Desk, Proposal, Modified, and Money. Company email only. Same password as the CRM book — not Gmail. Bookmark ${YARD_PUBLIC}.</p>
      <form id="login-form" method="post" action="/auth/login">
        <label for="email">Company email</label>
        <input id="email" name="email" type="text" inputmode="email" autocomplete="username" placeholder="you@cbshippingsolutions.com" required />
        <label for="password">CRM password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <div class="row"><button type="submit" class="gold" id="login-go">Open The Yard</button></div>
        <p class="err" id="login-err">${loginError}</p>
        <noscript><p class="err">Turn JavaScript on in Safari, then open this page again.</p></noscript>
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
        <button type="button" data-mod="modified">Modified</button>
        <button type="button" data-mod="money">Money</button>
      </nav>
    </aside>
    <div class="stage">
      <header>
        <div>
          <div class="brand">THE YARD</div>
          <div class="sub">CRM · Desk · Proposal · Modified · Money</div>
        </div>
        <div class="right">
          <div class="who" id="who"></div>
          <button type="button" class="secondary" id="out">Sign out</button>
        </div>
      </header>
      <main>
        <section id="mod-home">
          <h1>One book. The whole desk.</h1>
          <p class="muted">This is The Yard. Sign in once. Work CRM, Desk, Proposal, Modified, and Money from here.</p>
          <div class="chips" id="tool-chips"></div>
          <div class="tiles" style="margin-top:14px">
            <div class="card tile" data-go="crm"><div class="kicker">Book</div><h2>CRM</h2><p class="muted">Contacts, follow-ups, tasks, pipeline, notes.</p></div>
            <div class="card tile" data-go="desk"><div class="kicker">Assist</div><h2>Desk</h2><p class="muted">Your CBSS AI — built for every CB Shipping Solutions employee. Ask it. Then go close.</p></div>
            <div class="card tile" data-go="proposal"><div class="kicker">Quote</div><h2>Proposal</h2><p class="muted">Build the quote. Send the proposal. Put the deal in writing before they cool off.</p></div>
            <div class="card tile" data-go="modified"><div class="kicker">Build</div><h2>Modified</h2><p class="muted">Doors, windows, electrical, insulation, framing, roll-up, and the CB Apex helical foundation.</p></div>
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
            <button type="button" class="secondary" data-crm="facebook">Facebook</button>
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
            <div id="crm-facebook" class="hide">
              <h2>Facebook app</h2>
              <p class="muted">Paste the App ID, app secret, and client token from Meta for Developers. Empty boxes keep what is already saved. The secret and token are not shown again.</p>
              <p class="muted" id="fb-status">Facebook is not connected yet.</p>
              <label for="fb-app-id">App ID</label>
              <input id="fb-app-id" autocomplete="off" placeholder="App ID" />
              <label for="fb-app-secret">App secret</label>
              <input id="fb-app-secret" type="password" autocomplete="off" placeholder="App secret" />
              <label for="fb-client-token">Client token</label>
              <input id="fb-client-token" type="password" autocomplete="off" placeholder="Client token" />
              <div class="row"><button type="button" id="fb-save">Save Facebook credentials</button></div>
              <p class="err" id="fb-err"></p>
            </div>
            <p class="err" id="crm-err"></p>
          </div>
        </section>

        <section id="mod-desk" class="hide">
          <div class="tabs" id="desk-tabs">
            <button type="button" class="on" data-desk="chat">CBSS AI</button>
            <button type="button" data-desk="call">Call</button>
            <button type="button" data-desk="email">Email templates</button>
            <button type="button" data-desk="new">New contact</button>
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
            <label for="desk-q">Working contact</label>
            <input id="desk-q" placeholder="Name, phone, email, ZIP" autocomplete="off" />
            <div class="hits hide" id="desk-hits"></div>
            <div class="picked hide" id="desk-sel"></div>
            <div class="row">
              <button type="button" class="secondary" id="desk-new-open">New contact</button>
              <button type="button" class="secondary" id="desk-clear">Clear</button>
            </div>
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
          <div id="desk-new" class="card hide" style="margin-top:12px">
            <div id="n-ok" class="save-flash hide" role="status" aria-live="polite">
              <p class="kicker">Saved</p>
              <h3 id="n-ok-title">Contact saved to CRM</h3>
              <p id="n-ok-body"></p>
            </div>
            <h2>New contact</h2>
            <p class="muted">Saves a real CRM lead for the signed-in rep. Notes go on that lead. I will not invent a price.</p>
            <div class="split">
              <div><label for="n-first">First name</label><input id="n-first" autocomplete="given-name" /></div>
              <div><label for="n-last">Last name</label><input id="n-last" autocomplete="family-name" /></div>
            </div>
            <div class="split">
              <div><label for="n-email">Email</label><input id="n-email" type="email" autocomplete="email" /></div>
              <div><label for="n-phone">Phone</label><input id="n-phone" type="tel" autocomplete="tel" /></div>
            </div>
            <label for="n-company">Business name</label>
            <input id="n-company" autocomplete="organization" />
            <label for="n-street">Address</label>
            <input id="n-street" autocomplete="street-address" />
            <div class="split">
              <div><label for="n-city">City</label><input id="n-city" autocomplete="address-level2" /></div>
              <div><label for="n-state">State</label><input id="n-state" autocomplete="address-level1" /></div>
            </div>
            <label for="n-zip">ZIP</label>
            <input id="n-zip" inputmode="numeric" maxlength="10" autocomplete="postal-code" />
            <label for="n-notes">Notes</label>
            <textarea id="n-notes" rows="4" placeholder="What they need, next step, anything the book should keep"></textarea>
            <label>Is this CTE or follow-up?</label>
            <div class="picks" id="n-track">
              <button type="button" class="on" data-track="cte">CTE</button>
              <button type="button" data-track="followup">Follow-up</button>
            </div>
            <p class="muted" id="n-track-help">CTE is first outreach — Call, then Text, then Email. Follow-up is after they connected.</p>
            <div class="split">
              <div><label for="n-action">Next action</label><input id="n-action" placeholder="Call about site access" /></div>
              <div><label for="n-when">Follow-up date</label><input id="n-when" type="datetime-local" /></div>
            </div>
            <div class="row"><button type="button" class="gold" id="n-save">Save to CRM</button></div>
            <p class="err" id="n-err"></p>
          </div>
        </section>

        <section id="mod-proposal" class="hide">
          <div class="card">
            <div class="ai-head">
              <div class="ai-mark">Q</div>
              <div>
                <h2>Write the proposal</h2>
                <p class="muted">Proposal Builder · posted xChange wholesale only. Add another box to compare a second grade — the client PDF shows Option A / Option B and they pick one. Do not invent a price.</p>
              </div>
            </div>
            <div class="warn">Side door OS 2D ≠ Side door OS 4D ≠ Full open side. OS 2D, OS 4D, and Full open side are different boxes — do not mix them. Pick the exact config the yard posted.</div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">1</div>
              <div>
                <h2>Pick the box</h2>
                <p class="muted">Size, height, door type, and grade. Get a posted price, add this box, then Add another box for a second grade — 20 ft cargo worthy next to 20 ft one-trip. That builds alternate options, not a buy-both total.</p>
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
            <div class="row">
              <button type="button" class="gold" id="p-add">Add this box</button>
              <button type="button" class="secondary" id="p-another" title="Add a second grade as Option B on the client proposal">Add another box</button>
            </div>
            <div id="p-lines"></div>
          </div>

          <form id="p-form">
          <div class="card step">
            <div class="step-head">
              <div class="step-num">4</div>
              <div>
                <h2>Who it is for</h2>
                <p class="muted">Put the customer on the proposal while the yes is still warm. Enter writes it. Shift+Enter adds a line in notes.</p>
              </div>
            </div>
            <div class="split">
              <div><label>Customer name</label><input id="p-name" required /></div>
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
                <p class="muted">Needs a posted wholesale on every box. Two grades become Option A / Option B on the client PDF. Enter writes the proposal and emails it. It does not invent a number.</p>
              </div>
            </div>
            <div class="row"><button type="submit" class="gold" id="p-send">Enter proposal</button></div>
            <p class="err" id="p-err"></p>
          </div>
          </form>
        </section>

        <section id="mod-modified" class="hide">
          <div class="card">
            <div class="ai-head">
              <div class="ai-mark">M</div>
              <div>
                <h2>Modified container</h2>
                <p class="muted">Build the spec from the products we actually install. CB Apex helical pylons, doors, roll-up, windows, framing, insulation, electrical. I will not invent a price.</p>
              </div>
            </div>
            <div class="warn">This is the build-out book, not an xChange dry-box quote. Side door OS 2D, OS 4D, and Full open are different boxes — do not mix them. Pile count and money wait for the land walk and an agreed number.</div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">1</div>
              <div>
                <h2>The box and the land</h2>
                <p class="muted">Size, height, and grade of the container. Site ZIP is for the land, not a pretend price.</p>
              </div>
            </div>
            <label>Size</label>
            <div class="picks big" id="x-size"></div>
            <label>Height</label>
            <div class="picks big" id="x-height"></div>
            <label>Grade</label>
            <div class="picks big" id="x-grade"></div>
            <label>What they are building</label>
            <div class="picks" id="x-use"></div>
            <div class="split">
              <div><label for="x-qty">How many boxes</label><input id="x-qty" inputmode="numeric" value="1" /></div>
              <div><label for="x-zip">Site ZIP</label><input id="x-zip" inputmode="numeric" maxlength="5" placeholder="72401" /></div>
            </div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">2</div>
              <div>
                <h2>CB Apex foundation</h2>
                <p class="muted">Helical pylons for container loads. Installed before the box is set. No slab delay.</p>
              </div>
            </div>
            <div class="mod-apex">
              <div class="kicker">House product</div>
              <h3>CB Apex — helical pylons</h3>
              <p>Resists frost heave and wind uplift. Faster and cleaner than a pour. Count the piles on the land walk. Do not guess.</p>
            </div>
            <label class="row"><input id="x-apex" type="checkbox" style="width:auto" checked /> Use CB Apex helical pylons</label>
            <div class="split">
              <div><label for="x-piles">Pylon count from the land walk</label><input id="x-piles" inputmode="numeric" placeholder="Blank until the walk" /></div>
              <div><label for="x-apex-note">Land / soil note</label><input id="x-apex-note" placeholder="Frost, slope, access" /></div>
            </div>
            <label class="row"><input id="x-apex-hw" type="checkbox" style="width:auto" checked /> Include Apex pile-to-box hardware</label>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">3</div>
              <div>
                <h2>Openings, shell, and power</h2>
                <p class="muted">Doors, roll-up, windows, framing, insulation, electrical, vents, finish. Check what they need. Qty is pieces, not a dollar.</p>
              </div>
            </div>
            <div id="x-catalog"></div>
          </div>

          <div class="card step">
            <div class="step-head">
              <div class="step-num">4</div>
              <div>
                <h2>The spec</h2>
                <p class="muted">This is the build list. An amount goes here only if they already agreed to a number.</p>
              </div>
            </div>
            <div class="quote-ticket" id="x-ticket">
              <div class="kicker">Build list</div>
              <p class="cash" id="x-ticket-title">Modified container</p>
              <p class="muted" id="x-ticket-body">Pick the box or a modification.</p>
            </div>
            <label for="x-notes">Extra notes</label>
            <textarea id="x-notes" rows="3" placeholder="Cuts, interior layout, anything the book should keep. Do not invent a price."></textarea>
            <div class="split">
              <div><label for="x-amount">Agreed amount (optional)</label><input id="x-amount" inputmode="decimal" placeholder="Agreed number only" /></div>
              <div>
                <label for="x-q">Attach CRM contact</label>
                <input id="x-q" placeholder="Name, phone, email" autocomplete="off" />
                <div class="hits hide" id="x-hits"></div>
                <div class="picked hide" id="x-sel"></div>
              </div>
            </div>
            <div class="row">
              <button type="button" class="gold" id="x-save">Save spec to CRM</button>
              <button type="button" class="secondary" id="x-copy">Copy spec</button>
              <button type="button" class="secondary" id="x-proposal">Open in Proposal</button>
              <button type="button" class="secondary" id="x-money">Open in Money</button>
            </div>
            <p class="err" id="x-err"></p>
          </div>
        </section>

        <section id="mod-money" class="hide">
          <div class="card">
            <h2>Send invoice</h2>
            <p class="muted">Builds the navy/gold invoice PDF, downloads it, and opens Gmail to you. Attach that PDF and send it to the customer. The amount is the number they agreed to. Do not invent a price. ACH / wire only is the standard path.</p>
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
              <button type="button" class="secondary" id="i-gmail">Send invoice to me</button>
            </div>
            <p class="err" id="i-err"></p>
            <div class="outbox" id="i-out">The invoice PDF downloads here, then Gmail opens so you can attach it.</div>
            <div class="row hide" id="i-doc-actions">
              <button type="button" class="gold" id="i-download-pdf">Download PDF</button>
              <button type="button" class="secondary" id="i-open-doc">Open invoice</button>
              <button type="button" class="secondary" id="i-print-doc">Print</button>
            </div>
            <iframe id="i-preview" class="hide" title="Invoice preview" style="width:100%;min-height:420px;border:1px solid var(--line);border-radius:8px;margin-top:10px;background:#fff"></iframe>
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
  <div id="p-saved" class="save-alert hide" role="alertdialog" aria-modal="true" aria-labelledby="p-saved-title" aria-describedby="p-saved-body">
    <div class="box">
      <p class="kicker">Proposal</p>
      <h3 id="p-saved-title">Proposal written</h3>
      <p id="p-saved-body"></p>
      <div class="row"><button type="button" class="gold" id="p-saved-ok">Got it</button></div>
    </div>
  </div>
  <div id="n-saved" class="save-alert hide" role="alertdialog" aria-modal="true" aria-labelledby="n-saved-title" aria-describedby="n-saved-body">
    <div class="box">
      <p class="kicker">Success</p>
      <h3 id="n-saved-title">Contact saved</h3>
      <p id="n-saved-body"></p>
      <div class="row"><button type="button" class="gold" id="n-saved-ok">Got it</button></div>
    </div>
  </div>
  <div id="contact-edit" class="modal-back hide">
    <div class="modal-card">
      <h2>Edit contact</h2>
      <input type="hidden" id="m-id" />
      <div><label for="m-name">Name</label><select id="m-name"></select></div>
      <div class="split">
        <div><label for="m-email">Email</label><input id="m-email" /></div>
        <div><label for="m-phone">Phone</label><input id="m-phone" /></div>
      </div>
      <div class="split">
        <div><label for="m-city">City</label><input id="m-city" /></div>
        <div><label for="m-state">State</label><input id="m-state" /></div>
      </div>
      <div class="split">
        <div><label for="m-zip">ZIP</label><input id="m-zip" /></div>
        <div><label for="m-company">Company</label><input id="m-company" /></div>
      </div>
      <div class="split">
        <div>
          <label for="m-owner">Owner</label>
          <select id="m-owner"></select>
        </div>
        <div>
          <label for="m-status">Stage</label>
          <select id="m-status"></select>
        </div>
      </div>
      <div class="split">
        <div>
          <label for="m-source">Source</label>
          <select id="m-source">
            <option value="Manual">Manual</option>
            <option value="Quote Form">Quote Form</option>
            <option value="Drive Deals">Drive Deals</option>
            <option value="Proposal Tool">Proposal Tool</option>
            <option value="Desk">Desk</option>
          </select>
        </div>
        <div>
          <label for="m-client">Client type</label>
          <select id="m-client">
            <option value="">—</option>
            <option>Residential</option>
            <option>Commercial</option>
          </select>
        </div>
      </div>
      <div class="split">
        <div>
          <label for="m-size">Size</label>
          <select id="m-size">
            <option value="">—</option>
            <option>20STD</option>
            <option>20HC</option>
            <option>40STD</option>
            <option>40HC</option>
            <option>Specialized</option>
          </select>
        </div>
        <div>
          <label for="m-condition">Condition</label>
          <select id="m-condition">
            <option value="">—</option>
            <option value="CW">CW</option>
            <option value="WWT">WWT</option>
            <option value="one-trip">one-trip</option>
            <option value="as-is">as-is</option>
          </select>
        </div>
      </div>
      <div class="split">
        <div><label for="m-depot">Depot</label><input id="m-depot" /></div>
        <div><label for="m-delivery">Delivery</label><input id="m-delivery" /></div>
      </div>
      <div class="split">
        <div>
          <label for="m-payment">Payment type</label>
          <select id="m-payment">
            <option value="">—</option>
            <option value="cash">Cash</option>
            <option value="flex">Flex Buy</option>
          </select>
        </div>
        <div>
          <label for="m-amount">Proposal amount</label>
          <input id="m-amount" inputmode="decimal" placeholder="Agreed proposal number only" />
        </div>
      </div>
      <div class="split">
        <div>
          <label for="m-invoice-paid">Invoice paid</label>
          <select id="m-invoice-paid">
            <option value="no">No — they have not paid the invoice</option>
            <option value="yes">Yes — they paid the invoice</option>
          </select>
        </div>
        <div><label for="m-wholesale">Wholesale</label><input id="m-wholesale" inputmode="decimal" placeholder="Posted number only" /></div>
      </div>
      <div>
        <label class="row"><input id="m-dnc" type="checkbox" style="width:auto" /> DNC</label>
      </div>
      <p class="err" id="m-err"></p>
      <div class="row">
        <button type="button" class="gold" id="m-save">Save</button>
        <button type="button" class="secondary" id="m-cancel">Cancel</button>
      </div>
    </div>
  </div>
  <script>
    const STAGES = ["New Lead","Contacted","CTE in progress","Follow up in progress","Email campaign","Quote","Proposal Sent","Flex Buy","Won","Lost","DNC"];
    const SIZES = [{v:"20",l:"20 ft"},{v:"40",l:"40 ft"},{v:"10",l:"10 ft"},{v:"45",l:"45 ft"},{v:"53",l:"53 ft"}];
    const HEIGHTS = [{v:"DC",l:"Standard / DC"},{v:"HC",l:"High cube / HC"}];
    const CONFIGS = [
      {v:"standard",l:"Standard"},{v:"double-door",l:"Double door"},
      {v:"side-os-2d",l:"Side door (OS 2D)"},{v:"side-os-4d",l:"Side door (OS 4D)"},
      {v:"full-open-side",l:"Full open side"},{v:"tri-door",l:"Tri-door"}
    ];
    const GRADES = [{v:"WWT",l:"WWT"},{v:"CW",l:"CW"},{v:"IICL",l:"IICL / Multi-Trip"},{v:"OneTrip",l:"One-Trip"},{v:"AsIs",l:"As-Is"}];
    const TEAM = ${JSON.stringify(TEAM_OWNERS)};
    const OWNER_ALIASES = ${JSON.stringify(OWNER_ALIASES)};
    const SPARKS = ${JSON.stringify(SALES_SPARKS)};
    const CHANGE_LABELS = ${JSON.stringify(CONTACT_CHANGE_LABELS)};
    const MOD_CATS = ${JSON.stringify(MODIFIED_CATEGORIES)};
    const MOD_ITEMS = ${JSON.stringify(MODIFIED_ITEMS)};
    const MOD_USES = ${JSON.stringify(MODIFIED_USES)};
    let user = null, book = null, selected = null, deskContact = null, deskHits = [], deskSearchSeq = 0, deskSearchTimer = 0, lastGmail = "", lastDoc = "", lastPdf = "", pick = {size:"40",height:"HC",config:"standard",grade:"CW"};
    let lastQuote = null;
    let proposalLines = [];
    let campaignIds = {};
    let offers = [];
    let chatHistory = [];
    let compPick = { size:"40HC", grade:"CW", config:"Standard" };
    let deskSeeded = false;
    let xPick = { size:"40", height:"HC", grade:"CW", use:"shop" };
    let xContact = null, xSearchSeq = 0, xSearchTimer = 0, xCatalogReady = false;

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
      ["home","crm","desk","proposal","modified","money"].forEach(function(m){ $("mod-"+m).classList.toggle("hide", m!==mod); });
      if (mod==="desk") { openDesk("chat"); loadTemplates(); seedAsk(); }
      if (mod==="modified") seedModified();
      if (mod==="money") { seedInvoiceFromContact(); loadInvoices(); }
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
      opt = opt || {};
      const allow401 = opt.allow401;
      const allowError = opt.allowError;
      const fetchOpt = Object.assign({ credentials:"same-origin", headers:{ "Content-Type":"application/json" } }, opt);
      delete fetchOpt.allow401;
      delete fetchOpt.allowError;
      const r = await fetch(path, fetchOpt);
      const j = await r.json().catch(function(){ return {}; });
      if (r.status===401){
        if (allow401) return { r:r, j:j };
        if (!user) show("login");
        throw new Error(j.error || "Sign in first.");
      }
      if (!r.ok && !allowError){
        throw new Error(j.error || j.message || ("Request failed ("+r.status+")."));
      }
      return { r:r, j:j };
    }
    function money(n){ return "$" + Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function displayAmount(v){
      if (v===undefined || v===null || v==="") return "";
      const n = typeof v==="number" ? v : parseFloat(String(v).replace(/[$,]/g,""));
      if (!Number.isFinite(n) || n===0) return "";
      return "$" + n.toLocaleString("en-US",{maximumFractionDigits:2});
    }
    function invoicePaidYes(c){
      const raw = String(c && c.invoicePaid != null ? c.invoicePaid : "").trim().toLowerCase();
      return raw==="yes" || raw==="paid" || raw==="true";
    }
    function titleOwner(s){
      const raw = String(s||"").trim().replace(/\\s+/g," ");
      if (!raw) return "";
      const compact = raw.toLowerCase().replace(/[\\s_-]+/g,"");
      if (compact==="new/unassigned" || compact==="newunassigned" || compact==="unassigned") return "New/Unassigned";
      if (compact==="kylehodgkiss") return "Kyle Hodgkiss";
      const first = raw.split(/[\\s@]/)[0].toLowerCase();
      return OWNER_ALIASES[first] || raw;
    }
    function mineName(){ return titleOwner((user && (user.name||user.email))||""); }
    function contactStage(c){
      if (!c) return "";
      const deal = ((book&&book.deals)||[]).find(function(d){ return String(d.contactId)===String(c.id); });
      return String((deal && deal.stage) || c.status || "").trim();
    }
    function stageOptions(selected){
      const cur = String(selected||"");
      return '<option value="">—</option>'+STAGES.map(function(st){
        return '<option'+(st===cur?" selected":"")+">"+st+"</option>";
      }).join("");
    }
    function officeMail(local){ return [local, "cbshippingsolutions.com"].join("@"); }
    function agentInvoiceGmail(rep, customerName, customerEmail, amount, notes, invoiceNo, docUrl, payMethod){
      const first = String((rep && rep.name) || "there").trim().split(/\\s+/)[0] || "there";
      const to = String((rep && rep.email) || "").trim();
      const cc = [officeMail("christopher"), officeMail("aliyah")].filter(function(e){ return e && e!==to; }).join(",");
      const subject = "Invoice "+invoiceNo+" ready to forward — "+(customerName||"customer");
      const body = [
        "Hi "+first+",",
        "",
        "Invoice "+invoiceNo+" for "+(customerName||"the customer")+(customerEmail?" ("+customerEmail+")":"")+" is ready.",
        amount ? ("Amount: "+amount+" — do not invent a price.") : "Amount is on the invoice. Do not invent a price.",
        notes ? ("Notes: "+notes) : "",
        payMethod==="ach" ? "ACH / wire only — no card link." : "",
        "",
        "Attach the PDF that just downloaded ("+(invoiceNo||"invoice")+".pdf) and send this to the customer. Gmail will not attach a file by itself.",
        docUrl ? ("On-screen invoice: "+docUrl) : "",
        customerEmail ? ("Send to: "+customerEmail) : "",
        "",
        "CBGC LLC DBA CB Shipping Solutions"
      ].filter(function(line, i, arr){ return line!=="" || arr[i-1]!==""; }).join("\\n");
      return "https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(to)
        +(cc ? "&cc="+encodeURIComponent(cc) : "")
        +"&su="+encodeURIComponent(subject)
        +"&body="+encodeURIComponent(body);
    }

    document.getElementById("login-form").addEventListener("submit", async function(e){
      const email = String($("email").value||"").trim();
      const password = String($("password").value||"");
      if (!email || !password){
        e.preventDefault();
        $("login-err").textContent = password ? "Use your full company email — name@cbshippingsolutions.com." : "Type your CRM password in the password box, then Open The Yard.";
        $(password ? "email" : "password").focus();
        return;
      }
      e.preventDefault();
      $("login-err").textContent = "";
      const btn = $("login-go");
      if (btn){ btn.disabled = true; btn.textContent = "Opening…"; }
      try {
        const res = await api("/auth/login", {
          method:"POST",
          body: JSON.stringify({ email:email, password:password }),
          allow401: true,
          allowError: true
        });
        if (!res.r.ok || !res.j.ok){ $("login-err").textContent = res.j.error || "Could not sign in."; return; }
        user = res.j.user; greet(user.name); paintTools(user.tools); show("app"); openMod("home");
        try { await loadCrm(); } catch (err) { $("crm-err").textContent = "Signed in. Refresh if the book stays empty."; }
      } catch (err) {
        try { e.target.submit(); return; }
        catch (ignored) { $("login-err").textContent = (err && err.message) ? err.message : "Could not sign in. Try again."; }
      } finally {
        if (btn){ btn.disabled = false; btn.textContent = "Open The Yard"; }
      }
    });
    $("out").addEventListener("click", async function(){ try { await api("/auth/logout",{method:"POST"}); } catch (e) {} show("login"); });
    document.querySelectorAll("#nav [data-mod]").forEach(function(btn){
      btn.addEventListener("click", function(){ openMod(btn.dataset.mod); });
    });
    document.querySelectorAll("[data-go]").forEach(function(tile){
      tile.addEventListener("click", function(){ openMod(tile.getAttribute("data-go")); });
    });
    document.querySelectorAll("[data-crm]").forEach(function(btn){
      btn.addEventListener("click", function(){
        ["contacts","followups","tasks","pipeline","campaign","facebook"].forEach(function(v){ $("crm-"+v).classList.toggle("hide", v!==btn.dataset.crm); });
        if (btn.dataset.crm==="followups") renderFollowups();
        if (btn.dataset.crm==="tasks") renderTasks();
        if (btn.dataset.crm==="pipeline") renderPipeline();
        if (btn.dataset.crm==="campaign") renderCampaign();
        if (btn.dataset.crm==="facebook") loadFacebook();
      });
    });

    async function loadCrm(){
      $("crm-err").textContent = "Loading book…";
      let res;
      try {
      res = await api("/x/crm/crm-data?action=get&omitNotes=1", { allowError: true });
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not load CRM.";
        return;
      }
      if (!res.r.ok){ $("crm-err").textContent = res.j.error || res.j.message || "Could not load CRM."; return; }
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
      try {
        const res = await api("/campaign", { allowError: true });
        if (!res.r.ok) return;
        campaignIds = {};
        (res.j.items||[]).forEach(function(row){ campaignIds[String(row.id)] = row; });
      } catch (e) {}
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
        return '<tr data-id="'+esc(String(c.id))+'"><td>'+esc(c.name||"")+'</td><td class="phone-hide">'+esc(c.company||"")+'</td><td class="phone-hide">'+esc(c.city||"")+"</td><td>"+esc(c.owner||"")+"</td><td>"+esc(contactStage(c)||"")+"</td></tr>";
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
      let notes = [];
      let notesErr = "";
      try {
        const res = await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"getNotes", contactId:String(id) }), allowError: true });
        if (!res.r.ok){
          notesErr = res.j.error || res.j.message || "Could not load notes. Try again.";
        } else {
          notes = (res.j.notes && (res.j.notes[id]||res.j.notes[String(id)])) || [];
          selected.notes = notes;
        }
      } catch (err) {
        notesErr = (err && err.message) ? err.message : "Could not load notes. Try again.";
      }
      const fu = (book.followups||{})[id] || (book.followups||{})[String(id)] || {};
      const digits = String(selected.phone||"").replace(/\\D/g,"");
      const tel = digits.length===11 && digits.charAt(0)==="1" ? digits.slice(1) : digits;
      const mail = String(selected.email||"").trim();
      const gmail = mail ? "https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(mail) : "";
      const callHref = tel.length>=7 ? "tel:+1"+tel : "";
      const textHref = tel.length>=7 ? "sms:+1"+tel : "";
      $("crm-detail").innerHTML = "<h2>"+esc(selected.name||"")+"</h2>"
        +'<p class="muted">'+esc([selected.company,selected.phone,selected.email,selected.city,selected.state,selected.zip].filter(Boolean).join(" · "))+"</p>"
        +'<p>Owner '+esc(selected.owner||"—")+' · <span class="stage-chip">'+esc(contactStage(selected)||"No stage")+"</span>"+(selected.source?" · "+esc(selected.source):"")+(selected.amount?" · proposal "+money(selected.amount):"")+(invoicePaidYes(selected)?" · invoice paid":(selected.amount?" · invoice not paid":""))+(selected.dnc?" · DNC":"")+"</p>"
        +'<label for="crm-stage">Stage</label><select id="crm-stage">'+stageOptions(contactStage(selected))+"</select>"
        +'<div class="acts">'
        +(callHref ? '<a class="gold" href="'+callHref+'">Call</a>' : '<button type="button" class="secondary" disabled title="No phone on this contact">Call</button>')
        +(gmail ? '<a class="secondary" href="'+esc(gmail)+'" target="_blank" rel="noopener">Email</a>' : '<button type="button" class="secondary" disabled title="No email on this contact">Email</button>')
        +(textHref ? '<a class="secondary" href="'+textHref+'">Text</a>' : '<button type="button" class="secondary" disabled title="No phone on this contact">Text</button>')
        +'<button type="button" id="crm-edit">Edit</button>'
        +'<button type="button" class="secondary" id="add-campaign">Add to email campaign</button>'
        +"</div>"
        +(fu.pendingNext || fu.completed ? '<p class="muted">Just completed. Type the next follow-up and save it — it stays on the book.</p>' : "")
        +'<label>Follow-up</label><input id="fu-act" value="'+esc(fu.pendingNext || fu.completed ? "" : (fu.nextAction||""))+'" placeholder="e.g. Call about 40ft WWT pricing" />'
        +'<input id="fu-date" type="datetime-local" value="'+esc(fu.pendingNext || fu.completed ? "" : (fu.followUpDate||"").slice(0,16))+'" />'
        +'<div class="row"><button type="button" class="secondary" id="fu-save">Save follow-up</button><button type="button" id="fu-done">Complete</button></div>'
        +'<label>Add note</label><textarea id="note-text" rows="2"></textarea><div class="row"><button type="button" class="secondary" id="note-add">Add note</button></div>'
        +doneTodayHtml(selected)
        +(notesErr ? '<p class="err" id="crm-notes-err">'+esc(notesErr)+"</p>" : "")
        +"<div>"+(notesErr ? '<p class="muted">Notes did not load.</p>' : (notes.slice(0,20).map(function(n){ return '<div class="note"><strong>'+esc(n.tag||n.author||"")+"</strong> "+esc(n.timestamp||"")+"<div>"+esc(n.text||"")+"</div></div>"; }).join("")||'<p class="muted">No notes yet.</p>'))+"</div>";
      $("fu-save").onclick = saveFollowup;
      $("fu-done").onclick = completeTask;
      $("note-add").onclick = addNote;
      const campBtn = $("add-campaign");
      if (campBtn) campBtn.onclick = addToCampaign;
      const editBtn = $("crm-edit");
      if (editBtn) editBtn.onclick = function(){ openContactEdit(selected); };
      const stageSel = $("crm-stage");
      if (stageSel) stageSel.onchange = function(){ saveContactStage(selected.id, stageSel.value); };
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
    async function persistOpenFollowup(id, nextAction, followUpDate){
      const row = followupRow(nextAction, followUpDate);
      if (!row.nextAction && !row.followUpDate) return null;
      const patch = {};
      patch[id] = row;
      const edits = {};
      edits[id] = { nextAction: row.nextAction, followUpDate: row.followUpDate };
      await api("/x/crm/crm-data?action=saveFollowups", { method:"POST", body: JSON.stringify({ action:"saveFollowups", followups: patch }) });
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"saveContactEdits", contactEdits: edits }) });
      book.followups[id] = row;
      book.followups[String(id)] = row;
      const c = contactForId(id);
      if (c){ c.nextAction = row.nextAction; c.followUpDate = row.followUpDate; }
      return row;
    }
    async function saveFollowup(){
      if (!selected) return;
      try {
        const row = await persistOpenFollowup(selected.id, $("fu-act").value, $("fu-date").value);
        if (!row) return;
        $("crm-err").textContent = "";
        renderStats();
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not save follow-up.";
      }
    }
    async function completeTask(){
      if (!selected) return;
      const prev = $("fu-act").value.trim() || "Follow-up";
      try {
        await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"completeFollowup", contactId:String(selected.id), nextAction:prev }) });
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
        $("crm-err").textContent = "";
        renderStats(); renderFollowups(); renderTasks(); openContact(selected.id);
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not complete that follow-up.";
      }
    }
    async function addNote(){
      if (!selected) return;
      const text = $("note-text").value.trim();
      if (!text) return;
      try {
        await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"appendNote", contactId:String(selected.id), text:text, tag:"Desk" }) });
        $("crm-err").textContent = "";
        openContact(selected.id);
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not add that note.";
      }
    }
    async function addToCampaign(){
      if (!selected) return;
      try {
        const res = await api("/campaign/add", { method:"POST", body: JSON.stringify({
          id:String(selected.id), name:selected.name||"", email:selected.email||"", phone:selected.phone||"",
          city:selected.city||"", owner:selected.owner||""
        }) });
        (res.j.items||[]).forEach(function(row){ campaignIds[String(row.id)] = row; });
        $("crm-err").textContent = "";
        $("crm-detail").innerHTML = '<p class="muted">'+esc(selected.name||"That lead")+" moved to Email campaign. The future campaign tool will work this list.</p>";
        selected = null;
        renderStats(); renderContacts(); renderFollowups(); renderTasks(); renderPipeline(); renderCampaign();
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not add to campaign.";
      }
    }
    function fillNameList(current){
      const names = new Set();
      const cur = String(current||"").trim();
      if (cur) names.add(cur);
      ((book&&book.contacts)||[]).forEach(function(c){
        const n = String(c.name||"").trim();
        if (n) names.add(n);
      });
      const list = Array.from(names).sort(function(a,b){ return a.localeCompare(b); });
      $("m-name").innerHTML = list.map(function(n){
        return '<option value="'+esc(n)+'">'+esc(n)+"</option>";
      }).join("");
      if (cur) $("m-name").value = cur;
    }
    function fillOwnerList(current){
      const cur = titleOwner(current);
      const list = TEAM.slice();
      if (cur && list.indexOf(cur)<0) list.unshift(cur);
      $("m-owner").innerHTML = list.map(function(n){
        return '<option value="'+esc(n)+'">'+esc(n)+"</option>";
      }).join("");
      $("m-owner").value = cur || "New/Unassigned";
    }
    function closeContactEdit(){ $("contact-edit").classList.add("hide"); }
    function openContactEdit(c){
      if (!c) return;
      fillNameList(c.name||"");
      fillOwnerList(c.owner||"");
      $("m-id").value = String(c.id);
      $("m-email").value = c.email||"";
      $("m-phone").value = c.phone||"";
      $("m-city").value = c.city||"";
      $("m-state").value = c.state||"";
      $("m-zip").value = c.zip||"";
      $("m-company").value = c.company||"";
      $("m-status").innerHTML = stageOptions(contactStage(c));
      if (c.source && !$("m-source").querySelector('option[value="'+CSS.escape(c.source)+'"]')){
        const extra = document.createElement("option");
        extra.value = c.source;
        extra.textContent = c.source;
        $("m-source").appendChild(extra);
      }
      $("m-source").value = c.source||"Manual";
      $("m-client").value = c.clientType||"";
      $("m-size").value = c.containerSize||"";
      $("m-condition").value = c.condition||"";
      $("m-depot").value = c.depot||"";
      $("m-delivery").value = c.delivery||"";
      $("m-payment").value = c.paymentMode||"";
      $("m-amount").value = c.amount==null||c.amount==="" ? "" : String(c.amount);
      $("m-invoice-paid").value = invoicePaidYes(c) ? "yes" : "no";
      $("m-wholesale").value = c.wholesale==null||c.wholesale==="" ? "" : String(c.wholesale);
      $("m-dnc").checked = Boolean(c.dnc);
      $("m-err").textContent = "";
      $("contact-edit").classList.remove("hide");
    }
    function readContactEdit(){
      return {
        name: $("m-name").value.trim(),
        email: $("m-email").value.trim(),
        phone: $("m-phone").value.trim(),
        city: $("m-city").value.trim(),
        state: $("m-state").value.trim(),
        zip: $("m-zip").value.trim(),
        company: $("m-company").value.trim(),
        owner: titleOwner($("m-owner").value),
        status: $("m-status").value,
        source: $("m-source").value,
        clientType: $("m-client").value,
        containerSize: $("m-size").value,
        condition: $("m-condition").value,
        depot: $("m-depot").value.trim(),
        delivery: $("m-delivery").value.trim(),
        paymentMode: $("m-payment").value,
        amount: $("m-amount").value.trim(),
        invoicePaid: $("m-invoice-paid").value === "yes" ? "yes" : "no",
        wholesale: $("m-wholesale").value.trim(),
        dnc: $("m-dnc").checked
      };
    }
    function contactChangeLines(before, patch){
      const lines = [];
      Object.keys(patch||{}).forEach(function(key){
        const label = CHANGE_LABELS[key];
        if (!label) return;
        const oldRaw = key==="dnc" ? (before && before.dnc ? "yes" : "no") : key==="invoicePaid" ? (invoicePaidYes(before) ? "yes" : "no") : String(before && before[key]!=null ? before[key] : "").trim();
        const newRaw = key==="dnc" ? (patch.dnc ? "yes" : "no") : key==="invoicePaid" ? (invoicePaidYes(patch) ? "yes" : "no") : String(patch[key]==null ? "" : patch[key]).trim();
        const oldV = key==="owner" ? titleOwner(oldRaw) : oldRaw;
        const newV = key==="owner" ? titleOwner(newRaw) : newRaw;
        if (oldV===newV) return;
        lines.push(label+" changed from "+(oldV||"—")+" to "+(newV||"—"));
      });
      return lines;
    }
    async function recordContactChange(id, before, patch){
      const lines = contactChangeLines(before, patch);
      if (!lines.length) return;
      const who = String((user && (user.name||user.email))||"").trim();
      const text = (who ? who+" · " : "")+lines.join(". ")+".";
      try {
        await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"appendNote", contactId:String(id), text:text, tag:"Book" }) });
      } catch (_) {}
    }
    async function persistContactPatch(id, patch){
      const row = (book.contacts||[]).find(function(c){ return String(c.id)===String(id); }) || {};
      const before = {
        name: row.name, email: row.email, phone: row.phone, city: row.city, state: row.state, zip: row.zip,
        company: row.company, owner: row.owner, status: contactStage(row), source: row.source,
        clientType: row.clientType, containerSize: row.containerSize, condition: row.condition,
        depot: row.depot, delivery: row.delivery, paymentMode: row.paymentMode,
        amount: row.amount, invoicePaid: row.invoicePaid, wholesale: row.wholesale, dnc: row.dnc
      };
      const edits = {};
      edits[id] = patch;
      edits[String(id)] = patch;
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"saveContactEdits", contactEdits: edits }) });
      await recordContactChange(id, before, patch);
      if (row && row.id) Object.assign(row, patch);
      if (selected && String(selected.id)===String(id)) Object.assign(selected, patch);
      if (patch.status){
        book.deals = book.deals || [];
        let deal = book.deals.find(function(d){ return String(d.contactId)===String(id); });
        if (!deal){
          deal = {
            id: "c-"+String(id),
            contactId: String(id),
            contactName: (row && row.name) || "",
            owner: (row && row.owner) || "",
            stage: patch.status,
            amount: (row && row.amount) || patch.amount || ""
          };
          book.deals.push(deal);
        } else {
          deal.stage = patch.status;
          if (patch.amount!==undefined && patch.amount!=="") deal.amount = patch.amount;
          if (patch.name) deal.contactName = patch.name;
          if (patch.owner) deal.owner = patch.owner;
        }
        await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"saveDeals", deals: book.deals }) });
      }
    }
    async function saveContactStage(id, status){
      if (!id || !status) return;
      try {
        await persistContactPatch(id, { status: status });
        $("crm-err").textContent = "";
        renderStats(); renderContacts(); renderPipeline();
        if (selected && String(selected.id)===String(id)) openContact(id);
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not save stage.";
      }
    }
    async function saveContactEdit(){
      $("m-err").textContent = "";
      const id = $("m-id").value;
      const patch = readContactEdit();
      if (!patch.name){ $("m-err").textContent = "Name the contact first."; return; }
      try {
        await persistContactPatch(id, patch);
        closeContactEdit();
        renderStats(); renderContacts(); renderFollowups(); renderTasks(); renderPipeline();
        openContact(id);
      } catch (err) {
        $("m-err").textContent = (err && err.message) || "Could not save that contact.";
      }
    }
    $("m-save").addEventListener("click", saveContactEdit);
    $("m-cancel").addEventListener("click", closeContactEdit);
    $("contact-edit").addEventListener("click", function(e){ if (e.target===this) closeContactEdit(); });
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
      try {
        const res = await api("/campaign/return", { method:"POST", body: JSON.stringify({ id:id }) });
        campaignIds = {};
        (res.j.items||[]).forEach(function(row){ campaignIds[String(row.id)] = row; });
        $("crm-err").textContent = "";
        renderStats(); renderContacts(); renderCampaign();
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not return that lead.";
      }
    });
    function paintFacebookStatus(j){
      const bits = [];
      if (j && j.appId) bits.push("App ID "+j.appId);
      bits.push((j && j.hasAppSecret) ? "App secret saved" : "No app secret");
      bits.push((j && j.hasClientToken) ? "Client token saved" : "No client token");
      $("fb-status").textContent = bits.join(" · ");
      if (j && j.appId) $("fb-app-id").value = j.appId;
    }
    async function loadFacebook(){
      $("fb-err").textContent = "";
      const res = await api("/facebook/status", { allowError: true });
      if (!res.r.ok){
        $("fb-err").textContent = res.j.error || "Could not read Facebook status.";
        $("fb-status").textContent = "Facebook credentials stay with Christopher.";
        return;
      }
      paintFacebookStatus(res.j);
    }
    $("fb-save").addEventListener("click", async function(){
      $("fb-err").textContent = "";
      const res = await api("/facebook/save", { method:"POST", body: JSON.stringify({
        appId: $("fb-app-id").value,
        appSecret: $("fb-app-secret").value,
        clientToken: $("fb-client-token").value
      }), allowError: true });
      if (!res.r.ok || !res.j.ok){
        $("fb-err").textContent = res.j.error || "Could not save Facebook credentials.";
        return;
      }
      $("fb-app-secret").value = "";
      $("fb-client-token").value = "";
      paintFacebookStatus(res.j);
      $("fb-err").textContent = "Saved. The secret and token stay off the screen.";
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
        +'<label>'+(pending ? "Just completed. Set the next follow-up." : "Schedule another")+'</label><input data-next-act="'+esc(String(c.id))+'" placeholder="Next action" />'
        +'<input type="datetime-local" data-next-date="'+esc(String(c.id))+'" />'
        +'<div class="row" style="margin-top:6px"><button type="button" class="secondary" data-sched="'+esc(String(c.id))+'">Save next follow-up</button></div></td></tr>';
    }
    function workTable(rows, empty, doneToday){
      if (!rows.length) return '<p class="muted">'+empty+"</p>";
      return '<table><thead><tr><th>Name</th><th>Next action</th><th>Date</th><th>Owner</th><th></th></tr></thead><tbody>'
        +rows.map(function(c){ return workRow(c, doneToday); }).join("")+"</tbody></table>";
    }
    function renderFollowups(){
      const rows = openWorkRows();
      const done = doneTodayRows();
      $("crm-followups").innerHTML = "<h2>Follow-ups</h2><p class=\\"muted\\">Complete one, then type the next call on that same row. The new follow-up stays on the book. People you finished today stay under Done today — they are still in the CRM.</p>"
        +workTable(rows, "No open follow-ups.", false)
        +(done.length ? "<h2>Done today</h2><p class=\\"muted\\">"+done.length+" finished today. Set the next call here if they still need one.</p>"+workTable(done, "", true) : "");
    }
    function renderTasks(){
      const rows = openWorkRows();
      const done = doneTodayRows();
      $("crm-tasks").innerHTML = "<h2>Tasks</h2><p class=\\"muted\\">Same book as follow-ups. Complete, then save the next one on that row so it does not disappear.</p>"
        +workTable(rows, "No open tasks.", false)
        +(done.length ? "<h2>Done today</h2><p class=\\"muted\\">"+done.length+" finished today. They are still in the CRM.</p>"+workTable(done, "", true) : "");
    }
    function bindWorkLists(root){
      root.addEventListener("click", async function(e){
        const done = e.target.closest("[data-done]");
        const sched = e.target.closest("[data-sched]");
        if (done){ e.stopPropagation(); await completeWork(done.getAttribute("data-done")); return; }
        if (sched){ e.stopPropagation(); await scheduleWork(sched.getAttribute("data-sched")); return; }
        const tr = e.target.closest("tr[data-id]");
        if (tr && !e.target.closest("button, input, label, select")) {
          const tab = document.querySelector('[data-crm="contacts"]');
          if (tab) tab.click();
          openContact(tr.getAttribute("data-id"));
        }
      });
    }
    bindWorkLists($("crm-followups"));
    bindWorkLists($("crm-tasks"));
    async function completeWork(id){
      const c = contactForId(id);
      if (!c) return;
      const act = document.querySelector('[data-next-act="'+id+'"]');
      const when = document.querySelector('[data-next-date="'+id+'"]');
      const nextAction = act ? act.value.trim() : "";
      const followUpDate = when ? when.value : "";
      const f = (book.followups||{})[id]||(book.followups||{})[String(id)]||{};
      const action = c.nextAction || f.nextAction || "Follow-up";
      try {
      await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"completeFollowup", contactId:String(id), nextAction:action }) });
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
      } else {
        c.nextAction = ""; c.followUpDate = "";
        book.followups[id] = { nextAction:"", followUpDate:"", completed:true, status:"completed", pendingNext:true };
        book.followups[String(id)] = book.followups[id];
      }
      $("crm-err").textContent = "";
      renderStats(); renderFollowups(); renderTasks();
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not complete that follow-up.";
      }
    }
    async function scheduleWork(id){
      const act = document.querySelector('[data-next-act="'+id+'"]');
      const when = document.querySelector('[data-next-date="'+id+'"]');
      const nextAction = act ? act.value.trim() : "";
      const followUpDate = when ? when.value : "";
      if (!nextAction && !followUpDate) return;
      try {
        await persistOpenFollowup(id, nextAction, followUpDate);
        $("crm-err").textContent = "";
        renderStats(); renderFollowups(); renderTasks();
      } catch (err) {
        $("crm-err").textContent = (err && err.message) || "Could not save that follow-up.";
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
      const prev = deal.stage;
      deal.stage = sel.value;
      try {
        await api("/x/crm/crm-data", { method:"POST", body: JSON.stringify({ action:"saveDeals", deals: book.deals }) });
        $("crm-err").textContent = "";
        renderStats(); renderPipeline();
      } catch (err) {
        deal.stage = prev;
        sel.value = prev;
        $("crm-err").textContent = (err && err.message) || "Could not save that deal.";
      }
    });

    function openDesk(tab){
      document.querySelectorAll("#desk-tabs [data-desk]").forEach(function(b){ b.classList.toggle("on", b.dataset.desk===tab); });
      ["chat","call","email","new"].forEach(function(t){ $("desk-"+t).classList.toggle("hide", t!==tab); });
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
      try {
        const res = await api("/x/desk/chat", { method:"POST", body: JSON.stringify({ message:q, history:chatHistory }) });
        const reply = res.j.reply || res.j.text || res.j.error || "No reply.";
        chatHistory.push({ role:"assistant", content:reply });
        bubble("assistant", reply);
      } catch (err) {
        $("desk-chat-err").textContent = (err && err.message) || "Desk did not reply.";
      }
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
      try {
        const res = await api(path, { method:"POST", body: JSON.stringify({ zip:zip, size:compPick.size, grade:compPick.grade, config:compPick.config }) });
        const reply = res.j.reply || res.j.error || "Could not pull that posted price. Do not invent a number.";
        bubble("assistant", reply);
        chatHistory.push({ role:"user", content:"Pull "+who+" "+zip+" "+compPick.size+" "+compPick.grade+" "+compPick.config });
        chatHistory.push({ role:"assistant", content:reply });
      } catch (err) {
        $("desk-chat-err").textContent = (err && err.message) || "Could not pull that posted price. Do not invent a number.";
      }
    }
    $("comp-pull").addEventListener("click", function(){ pullCompetitor("container-one"); });
    $("comp-pull-usa").addEventListener("click", function(){ pullCompetitor("usa-containers"); });
    async function loadTemplates(){
      try {
        const res = await api("/x/desk/templates", { allowError: true });
        if (!res.r.ok) return;
        const tpls = res.j.templates||[];
        $("desk-tpl").innerHTML = tpls.map(function(t){ return '<option value="'+esc(t.id)+'">'+esc(t.group||"")+" — "+esc(t.title||t.id)+"</option>"; }).join("");
      } catch (e) {}
    }
    function renderDeskPicked(){
      const box = $("desk-sel");
      if (!deskContact || deskContact.id == null || String(deskContact.id)===""){
        box.classList.add("hide");
        box.textContent = "";
        return;
      }
      box.classList.remove("hide");
      box.textContent = [deskContact.name, deskContact.phone, deskContact.email, deskContact.city, deskContact.stage].filter(Boolean).join(" · ");
    }
    function pickDeskContact(c){
      if (!c || c.id == null || String(c.id)==="") return;
      deskContact = {
        id: String(c.id),
        name: c.name || "",
        phone: c.phone || "",
        email: c.email || "",
        city: c.city || "",
        zip: c.zip || "",
        stage: c.stage || c.status || ""
      };
      $("desk-q").value = deskContact.name || "";
      $("desk-hits").innerHTML = "";
      $("desk-hits").classList.add("hide");
      $("desk-err").textContent = "";
      renderDeskPicked();
    }
    function renderDeskHits(rows){
      deskHits = Array.isArray(rows) ? rows : [];
      const box = $("desk-hits");
      box.innerHTML = "";
      if (!deskHits.length){ box.classList.add("hide"); return; }
      box.classList.remove("hide");
      deskHits.slice(0,8).forEach(function(c){
        const b = document.createElement("button");
        b.type = "button";
        b.className = "hit" + (deskContact && String(deskContact.id)===String(c.id) ? " on" : "");
        b.setAttribute("data-contact", String(c.id));
        b.textContent = [c.name || "Unnamed", c.phone, c.city].filter(Boolean).join(" · ");
        function choose(e){
          if (e) e.preventDefault();
          pickDeskContact(c);
        }
        b.addEventListener("pointerdown", choose);
        b.addEventListener("click", choose);
        box.appendChild(b);
      });
    }
    $("desk-q").addEventListener("input", function(){
      const q = $("desk-q").value.trim();
      const seq = ++deskSearchSeq;
      clearTimeout(deskSearchTimer);
      if (q.length<2){ renderDeskHits([]); return; }
      deskSearchTimer = setTimeout(async function(){
        const res = await api("/x/desk/contacts?q="+encodeURIComponent(q), { allowError: true });
        if (seq !== deskSearchSeq) return;
        if (!res.r.ok){
          $("desk-err").textContent = res.j.error || "Could not search the CRM.";
          renderDeskHits([]);
          return;
        }
        renderDeskHits(res.j.contacts||[]);
      }, 280);
    });
    $("desk-clear").addEventListener("click", function(){
      deskContact = null;
      $("desk-q").value = "";
      renderDeskHits([]);
      renderDeskPicked();
      $("desk-err").textContent = "";
    });
    function hideNewContactSaved(){
      $("n-saved").classList.add("hide");
      $("n-ok").classList.add("hide");
      $("n-ok-title").textContent = "Contact saved to CRM";
      $("n-ok-body").textContent = "";
      $("n-saved-title").textContent = "Contact saved";
      $("n-saved-body").textContent = "";
    }
    function showNewContactSaved(name, summary){
      const who = String(name||"").trim();
      const line = String(summary||"Saved to CRM.").trim() || "Saved to CRM.";
      const headline = who ? who + " is in the CRM" : "Contact saved to CRM";
      $("n-ok-title").textContent = headline;
      $("n-ok-body").textContent = line;
      $("n-ok").classList.remove("hide");
      $("n-saved-title").textContent = headline;
      $("n-saved-body").textContent = line;
      $("n-saved").classList.remove("hide");
      $("n-err").className = "err";
      $("n-err").textContent = "";
      try { $("n-ok").scrollIntoView({ behavior:"smooth", block:"start" }); } catch (e) {}
      $("n-saved-ok").focus();
    }
    $("n-saved-ok").addEventListener("click", function(){ $("n-saved").classList.add("hide"); });
    $("n-saved").addEventListener("click", function(e){ if (e.target === $("n-saved")) $("n-saved").classList.add("hide"); });
    $("desk-new-open").addEventListener("click", function(){ hideNewContactSaved(); openDesk("new"); $("n-first").focus(); });
    let newTrack = "cte";
    $("n-track").addEventListener("click", function(e){
      const b = e.target.closest("[data-track]");
      if (!b) return;
      newTrack = b.getAttribute("data-track") === "followup" ? "followup" : "cte";
      $("n-track").querySelectorAll("[data-track]").forEach(function(x){ x.classList.toggle("on", x===b); });
      $("n-track-help").textContent = newTrack==="followup"
        ? "They already connected. Book one real follow-up."
        : "CTE is first outreach — Call, then Text, then Email. Follow-up is after they connected.";
    });
    function readNewContact(){
      return {
        firstName: $("n-first").value.trim(),
        lastName: $("n-last").value.trim(),
        email: $("n-email").value.trim(),
        phone: $("n-phone").value.trim(),
        company: $("n-company").value.trim(),
        street: $("n-street").value.trim(),
        city: $("n-city").value.trim(),
        state: $("n-state").value.trim(),
        zip: $("n-zip").value.trim(),
        notes: $("n-notes").value.trim(),
        track: newTrack,
        nextAction: $("n-action").value.trim(),
        followUpDate: $("n-when").value.trim()
      };
    }
    $("n-save").addEventListener("click", async function(){
      $("n-err").className = "err";
      $("n-err").textContent = "";
      hideNewContactSaved();
      const draft = readNewContact();
      if (!draft.firstName || !draft.lastName){
        $("n-err").textContent = "Type first and last name.";
        return;
      }
      let res;
      try {
        res = await api("/desk/contact", { method:"POST", body: JSON.stringify(draft), allowError: true });
      } catch (err) {
        $("n-err").textContent = (err && err.message) || "Could not save the contact to the CRM.";
        return;
      }
      if (!res.r.ok || !res.j.ok){
        $("n-err").textContent = res.j.error || "Could not save the contact to the CRM.";
        return;
      }
      const c = res.j.contact || {};
      pickDeskContact({
        id: c.id,
        name: c.name || (draft.firstName+" "+draft.lastName).trim(),
        phone: c.phone || draft.phone,
        email: c.email || draft.email,
        city: c.city || draft.city,
        zip: c.zip || draft.zip,
        stage: c.status || res.j.stage || "New Lead"
      });
      if (book && book.contacts && c.id != null){
        const id = String(c.id);
        const row = Object.assign({ source:"Desk", owner: titleOwner((user&&(user.name||user.email))||"") }, c, { status: c.status || res.j.stage || "New Lead" });
        const hit = (book.contacts||[]).find(function(item){ return String(item.id)===id; });
        if (hit) Object.assign(hit, row);
        else book.contacts.unshift(row);
        if (!book.followups) book.followups = {};
        book.followups[id] = { nextAction: c.nextAction || "", followUpDate: c.followUpDate || "", completed:false, status:"open" };
        fillOwners(); renderStats(); renderContacts();
      }
      $("n-notes").value = "";
      showNewContactSaved(c.name || (draft.firstName+" "+draft.lastName).trim(), res.j.summary || "Saved to CRM.");
    });
    $("desk-save").addEventListener("click", async function(){
      $("desk-err").textContent="";
      if (!deskContact || deskContact.id == null || String(deskContact.id)===""){
        $("desk-err").textContent="Search and pick a contact first.";
        return;
      }
      let res;
      try {
        res = await api("/x/desk/call/save", { method:"POST", body: JSON.stringify({
        contactId: String(deskContact.id),
        scraps: $("desk-scraps").value,
        pastCte: $("desk-past").checked,
        nextAction: $("desk-action").value,
        followUpDate: $("desk-when").value,
        create: { name: deskContact.name, phone: deskContact.phone, email: deskContact.email, zip: deskContact.zip }
      }), allowError: true });
      } catch (err) {
        $("desk-err").textContent = (err && err.message) || "Could not save to the CRM.";
        return;
      }
      $("desk-err").textContent = (!res.r.ok||!res.j.ok) ? (res.j.error||"Could not save to the CRM.") : (res.j.summary || "Saved to CRM.");
    });
    $("desk-render").addEventListener("click", async function(){
      try {
        const res = await api("/x/desk/templates/render", { method:"POST", body: JSON.stringify({ id: $("desk-tpl").value, name: deskContact && deskContact.name, firstName: (deskContact&&deskContact.name||"").split(" ")[0] }) });
        $("desk-body").textContent = res.j.body || res.j.text || JSON.stringify(res.j);
      } catch (err) {
        $("desk-err").textContent = (err && err.message) || "Could not render that template.";
      }
    });
    $("desk-copy").addEventListener("click", async function(){ try { await navigator.clipboard.writeText($("desk-body").textContent||""); } catch (e) {} });

    function xpicks(el, items, key){
      el.innerHTML = items.map(function(it){ return '<button type="button" data-v="'+it.v+'">'+it.l+"</button>"; }).join("");
      el.addEventListener("click", function(e){
        const b = e.target.closest("button"); if(!b) return;
        xPick[key]=b.dataset.v;
        el.querySelectorAll("button").forEach(function(x){ x.classList.toggle("on", x===b); });
        paintModifiedTicket();
      });
      const first = el.querySelector('[data-v="'+xPick[key]+'"]');
      if (first) first.classList.add("on");
    }
    function paintModifiedCatalog(){
      const skip = { foundation:true };
      $("x-catalog").innerHTML = MOD_CATS.filter(function(c){ return !skip[c.id]; }).map(function(cat){
        const items = MOD_ITEMS.filter(function(it){ return it.category===cat.id; });
        return '<div id="x-'+cat.id+'" style="margin-top:14px">'
          +"<h3>"+esc(cat.title)+"</h3>"
          +'<p class="muted">'+esc(cat.help)+"</p>"
          +items.map(function(it){
            return '<label class="mod-item" data-mod-item="'+esc(it.id)+'">'
              +'<input type="checkbox" data-mod-on="'+esc(it.id)+'" />'
              +'<span><span class="name">'+esc(it.name)+'</span><p class="spec">'+esc(it.spec)+"</p></span>"
              +'<input type="number" min="1" step="1" value="1" data-mod-qty="'+esc(it.id)+'" />'
              +"</label>";
          }).join("")
          +"</div>";
      }).join("");
    }
    function readModifiedUi(){
      const items = [];
      if ($("x-apex").checked) items.push({ id:"apex-helical", qty:"1" });
      if ($("x-apex-hw").checked) items.push({ id:"apex-hardware", qty:"1" });
      document.querySelectorAll("[data-mod-on]").forEach(function(box){
        if (!box.checked) return;
        const id = box.getAttribute("data-mod-on");
        const qtyEl = document.querySelector('[data-mod-qty="'+id+'"]');
        items.push({ id:id, qty: qtyEl ? qtyEl.value : "1" });
      });
      return {
        size: xPick.size, height: xPick.height, grade: xPick.grade, use: xPick.use,
        boxQty: $("x-qty").value, zip: $("x-zip").value,
        apexPiles: $("x-piles").value, apexNote: $("x-apex-note").value,
        items: items, agreedAmount: $("x-amount").value, notes: $("x-notes").value
      };
    }
    function modifiedSpecPreview(){
      const d = readModifiedUi();
      const lines = [];
      const box = [d.size?d.size+" ft":"", d.height==="HC"?"high cube":d.height==="DC"?"standard / DC":"", d.grade].filter(Boolean).join(" ");
      if (box) lines.push("Base box: "+(d.boxQty && String(d.boxQty)!=="1"?d.boxQty+" × ":"")+box);
      const use = MOD_USES.find(function(u){ return u.v===d.use; });
      if (use) lines.push("Use: "+use.l);
      if (d.zip) lines.push("Site ZIP: "+d.zip);
      d.items.forEach(function(line){
        const item = MOD_ITEMS.find(function(it){ return it.id===line.id; });
        if (!item) return;
        let row = item.name;
        if (line.qty && String(line.qty)!=="1") row += " × "+line.qty;
        if (item.id==="apex-helical" && d.apexPiles) row += " — "+d.apexPiles+" pylons from the land walk";
        if (item.id==="apex-helical" && d.apexNote) row += " ("+d.apexNote+")";
        lines.push(row);
      });
      if (d.notes) lines.push("Notes: "+d.notes);
      if (String(d.agreedAmount||"").trim()) lines.push("Agreed amount (typed, not invented): "+String(d.agreedAmount).trim());
      const hasApex = d.items.some(function(it){ return it.id==="apex-helical" || it.id==="apex-hardware"; });
      const title = hasApex ? (box ? "Modified "+box+" on CB Apex" : "Modified container on CB Apex") : (box ? "Modified "+box : "Modified container");
      return { title:title, lines:lines, text:[title].concat(lines).join("\\n") };
    }
    function paintModifiedTicket(){
      const spec = modifiedSpecPreview();
      $("x-ticket-title").textContent = spec.title;
      $("x-ticket-body").textContent = spec.lines.length ? spec.lines.join(" · ") : "Pick the box or a modification.";
    }
    function renderXHits(rows){
      const box = $("x-hits");
      box.innerHTML = "";
      if (!rows || !rows.length){ box.classList.add("hide"); return; }
      box.classList.remove("hide");
      rows.slice(0,8).forEach(function(c){
        const b = document.createElement("button");
        b.type = "button";
        b.className = "hit";
        b.textContent = [c.name || "Unnamed", c.phone, c.city].filter(Boolean).join(" · ");
        b.addEventListener("click", function(){
          xContact = c;
          $("x-q").value = c.name || "";
          $("x-sel").textContent = (c.name || "Unnamed")+" · "+(c.phone||"—");
          $("x-sel").classList.remove("hide");
          box.classList.add("hide");
        });
        box.appendChild(b);
      });
    }
    function seedModified(){
      if (xCatalogReady){ paintModifiedTicket(); return; }
      xCatalogReady = true;
      xpicks($("x-size"), SIZES, "size");
      xpicks($("x-height"), HEIGHTS, "height");
      xpicks($("x-grade"), GRADES, "grade");
      xpicks($("x-use"), MOD_USES, "use");
      paintModifiedCatalog();
      $("x-catalog").addEventListener("change", paintModifiedTicket);
      $("x-catalog").addEventListener("input", paintModifiedTicket);
      ["x-qty","x-zip","x-piles","x-apex-note","x-notes","x-amount"].forEach(function(id){
        $(id).addEventListener("input", paintModifiedTicket);
      });
      $("x-apex").addEventListener("change", paintModifiedTicket);
      $("x-apex-hw").addEventListener("change", paintModifiedTicket);
      paintModifiedTicket();
    }
    $("x-q").addEventListener("input", function(){
      const q = $("x-q").value.trim();
      const seq = ++xSearchSeq;
      clearTimeout(xSearchTimer);
      if (q.length<2){ renderXHits([]); return; }
      xSearchTimer = setTimeout(async function(){
        const res = await api("/x/desk/contacts?q="+encodeURIComponent(q), { allowError: true });
        if (seq !== xSearchSeq) return;
        if (!res.r.ok){ $("x-err").textContent = res.j.error || "Could not search the CRM."; renderXHits([]); return; }
        renderXHits(res.j.contacts||[]);
      }, 280);
    });
    $("x-save").addEventListener("click", async function(){
      $("x-err").className = "err";
      $("x-err").textContent = "";
      const draft = readModifiedUi();
      if (xContact && xContact.id != null) draft.contactId = String(xContact.id);
      const res = await api("/modified/spec", { method:"POST", body: JSON.stringify(draft), allowError: true });
      if (!res.r.ok || !res.j.ok){
        $("x-err").textContent = res.j.error || "Could not save that spec.";
        return;
      }
      $("x-err").className = "ok";
      $("x-err").textContent = res.j.saved
        ? "Spec saved to the CRM on "+((xContact && xContact.name) || "that contact")+"."
        : "Spec is ready. Attach a contact to put it on the book.";
    });
    $("x-copy").addEventListener("click", async function(){
      try { await navigator.clipboard.writeText(modifiedSpecPreview().text); $("x-err").className="ok"; $("x-err").textContent="Spec copied."; }
      catch (e) { $("x-err").className="err"; $("x-err").textContent="Could not copy."; }
    });
    $("x-proposal").addEventListener("click", function(){
      const spec = modifiedSpecPreview();
      $("p-notes").value = spec.text;
      if (xContact){
        $("p-name").value = xContact.name || $("p-name").value;
        $("p-email").value = xContact.email || $("p-email").value;
        $("p-phone").value = xContact.phone || $("p-phone").value;
      }
      if ($("x-zip").value) $("p-zip").value = $("x-zip").value;
      openMod("proposal");
    });
    $("x-money").addEventListener("click", function(){
      const spec = modifiedSpecPreview();
      $("i-notes").value = spec.text;
      if (xContact){
        $("i-name").value = xContact.name || $("i-name").value;
        $("i-email").value = xContact.email || $("i-email").value;
        $("i-phone").value = xContact.phone || $("i-phone").value;
      }
      if (String($("x-amount").value||"").trim()) $("i-amount").value = $("x-amount").value;
      openMod("money");
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
        }), allowError: true });
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
    function configLabel(v){
      const hit = CONFIGS.find(function(c){ return c.v===v; });
      return hit ? hit.l : (v || "Standard");
    }
    function currentProposalLine(){
      if (!lastQuote || !lastQuote.ok) return null;
      const wholesale = Number($("p-wholesale").value);
      const cash = Number($("p-cash").value);
      if (!wholesale || !cash) return null;
      const delivery = $("p-ful").value==="pickup" ? 0 : Number(lastQuote.delivery||0);
      return {
        size: pick.size, height: pick.height, config: pick.config, configLabel: configLabel(pick.config),
        grade: pick.grade, qty: Math.max(1, Number($("p-qty").value)||1),
        wholesale: wholesale, delivery: delivery, margin: Math.max(300, Number($("p-margin").value)||700),
        cash: cash, city: lastQuote.city || "", depot: lastQuote.depot || lastQuote.city || "",
        miles: lastQuote.miles, place: lastQuote.place || "", fulfillment: $("p-ful").value
      };
    }
    function proposalLineText(line){
      const qty = Math.max(1, Number(line.qty)||1);
      const height = line.height==="HC" ? "high cube" : line.height==="DC" ? "standard" : line.height;
      return (line.size||"")+" ft "+height+" "+(line.configLabel||"")+" "+(line.grade||"")+(qty>1?" × "+qty:"");
    }
    function paintProposalLines(){
      const box = $("p-lines");
      if (!proposalLines.length){ box.innerHTML = '<p class="muted">No second option yet. Get a posted price, Add this box, then Add another box for a different grade (cargo worthy next to one-trip). The client picks one option.</p>'; return; }
      box.innerHTML = proposalLines.map(function(line, i){
        const letter = String.fromCharCode(65+i);
        return '<div class="picked" data-pline="'+i+'"><strong>Option '+letter+' · '+esc(proposalLineText(line))+'</strong>'
          +" · proposal "+money(line.cash)+(line.city?" · depot "+esc(line.city):"")
          +' <button type="button" class="secondary" data-pline-x="'+i+'" style="margin-left:8px">Remove</button></div>';
      }).join("");
    }
    function addCurrentBox(){
      const line = currentProposalLine();
      if (!line){ $("p-err").className="err"; $("p-err").textContent="Get a posted CBSS price on this box first. Do not invent a wholesale."; return false; }
      const same = proposalLines.some(function(row){
        return row.size===line.size && row.height===line.height && row.config===line.config && row.grade===line.grade && row.qty===line.qty;
      });
      if (!same) proposalLines.push(line);
      paintProposalLines();
      $("p-err").className="ok";
      $("p-err").textContent = proposalLines.length===1
        ? "Option A is on the proposal. Add another box to compare a second grade."
        : proposalLines.length+" options are on the proposal. The client picks one.";
      return true;
    }
    $("p-add").addEventListener("click", function(){ addCurrentBox(); });
    $("p-another").addEventListener("click", function(){
      if (lastQuote && lastQuote.ok) addCurrentBox();
      lastQuote = null;
      $("p-wholesale").value = "";
      $("p-cash").value = "";
      $("p-ticket").classList.add("hide");
      $("p-status").textContent = "Pick the next grade for Option B, then Get CBSS Price. Do not invent a wholesale.";
    });
    $("p-lines").addEventListener("click", function(e){
      const b = e.target.closest("[data-pline-x]");
      if (!b) return;
      proposalLines.splice(Number(b.getAttribute("data-pline-x")), 1);
      paintProposalLines();
    });
    paintProposalLines();
    function showProposalSaved(title, body){
      $("p-saved-title").textContent = title;
      $("p-saved-body").textContent = body;
      $("p-saved").classList.remove("hide");
      $("p-saved-ok").focus();
    }
    $("p-saved-ok").addEventListener("click", function(){ $("p-saved").classList.add("hide"); });
    $("p-saved").addEventListener("click", function(e){ if (e.target === $("p-saved")) $("p-saved").classList.add("hide"); });
    function writeProposal(){
      if (typeof $("p-form").requestSubmit === "function") $("p-form").requestSubmit();
      else $("p-send").click();
    }
    $("p-zip").addEventListener("keydown", function(e){
      if (e.key === "Enter"){ e.preventDefault(); quoteMatch(false); }
    });
    $("p-qty").addEventListener("keydown", function(e){
      if (e.key === "Enter"){ e.preventDefault(); quoteMatch(false); }
    });
    $("p-form").addEventListener("keydown", function(e){
      if (e.key !== "Enter") return;
      if (e.target && e.target.tagName === "TEXTAREA" && e.shiftKey) return;
      e.preventDefault();
      writeProposal();
    });
    $("p-form").addEventListener("submit", async function(e){
      e.preventDefault();
      $("p-err").className = "err";
      $("p-err").textContent = "";
      if (!proposalLines.length && lastQuote && lastQuote.ok) addCurrentBox();
      if (!$("p-name").value.trim()){
        $("p-err").textContent = "Name the customer before you submit the proposal.";
        $("p-name").focus();
        return;
      }
      const lines = proposalLines.slice();
      if (!lines.length){
        $("p-err").textContent = "Get a posted CBSS price and add the box first. Do not invent a wholesale.";
        return;
      }
      $("p-send").disabled = true;
      try {
        const res = await api("/proposal/submit", { method:"POST", body: JSON.stringify({
          customerName:$("p-name").value, email:$("p-email").value, phone:$("p-phone").value, company:$("p-co").value,
          zip:$("p-zip").value, delivery:$("p-del").value, notes:$("p-notes").value,
          fulfillment:$("p-ful").value, clientType:"Residential", paymentMode:"cash",
          repName: user && (user.name || user.email), repEmail: user && user.email,
          lines: lines
        }), allowError: true});
        if (!res.r.ok || !res.j.ok){
          $("p-err").textContent = res.j.error || res.j.message || "The proposal did not write. Try again.";
          return;
        }
        if (res.j.status==="flagged"){
          $("p-err").textContent = "LOW MARGIN FLAG — below $300. No client proposal was sent.";
          showProposalSaved("Low margin flag", "Margin is under $300. Christopher and Bryan were notified. No client proposal went out.");
          return;
        }
        $("p-err").className = "ok";
        $("p-err").textContent = "Proposal written and emailed: "+(res.j.desc||"the boxes on this ticket")+".";
        showProposalSaved("Proposal written", (res.j.desc||"The options are on the proposal")+". It was emailed to you. Forward it to the customer. If there are two grades, they pick one option.");
      } catch (err) {
        $("p-err").textContent = "Could not reach the proposal tool. Sign out and sign in again.";
      } finally {
        $("p-send").disabled = false;
      }
    });

    function seedInvoiceFromContact(){
      if (!selected) return;
      if (!$("i-name").value) $("i-name").value = selected.name||"";
      if (!$("i-email").value) $("i-email").value = selected.email||"";
      if (!$("i-phone").value) $("i-phone").value = selected.phone||"";
      if (!$("i-co").value) $("i-co").value = selected.company||"";
      if (!$("i-amount").value && selected.amount) $("i-amount").value = String(selected.amount);
      if (!$("i-bcity").value && selected.city) $("i-bcity").value = selected.city;
      if (!$("i-bstate").value && selected.state) $("i-bstate").value = selected.state;
      if (!$("i-bzip").value && selected.zip) $("i-bzip").value = selected.zip;
    }
    function showInvoiceDoc(number){
      if (!number) return;
      lastDoc = "/x/invoice/invoice/document/"+encodeURIComponent(String(number));
      lastPdf = lastDoc+".pdf";
      $("i-doc-actions").classList.remove("hide");
      $("i-preview").classList.remove("hide");
      $("i-preview").src = lastDoc;
    }
    async function downloadInvoicePdf(number){
      const path = lastPdf || (number ? "/x/invoice/invoice/document/"+encodeURIComponent(String(number))+".pdf" : "");
      if (!path){ $("i-err").textContent="Build the invoice first."; return false; }
      const res = await fetch(path, { credentials:"same-origin" });
      if (!res.ok){ $("i-err").textContent="Could not build the invoice PDF."; return false; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = String(number||"invoice")+".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }
    async function makeInvoice(payMethod){
      $("i-err").textContent="";
      $("i-out").textContent = payMethod==="ach" ? "Building the branded ACH / wire invoice PDF…" : "Building the branded invoice PDF…";
      const same = $("i-same").checked;
      let res;
      try {
      res = await api("/x/invoice/invoice/create", { method:"POST", body: JSON.stringify({
        name:$("i-name").value, email:$("i-email").value, phone:$("i-phone").value, amountRaw:$("i-amount").value,
        notes:$("i-notes").value, company:$("i-co").value, warrantyKind:$("i-warr").value,
        billingStreet:$("i-bstreet").value, billingCity:$("i-bcity").value,
        billingState:$("i-bstate").value, billingZip:$("i-bzip").value,
        deliveryStreet: same?$("i-bstreet").value:$("i-dstreet").value,
        deliveryCity:same?$("i-bcity").value:$("i-dcity").value,
        deliveryState:same?$("i-bstate").value:$("i-dstate").value,
        deliveryZip:same?$("i-bzip").value:$("i-dzip").value,
        sameAsBilling: same, payMethod:payMethod
      }), allowError: true});
      if (!res.r.ok || !res.j.ok){ $("i-err").textContent=res.j.error||"Could not create that invoice."; $("i-out").textContent="The invoice PDF downloads here, then Gmail opens so you can attach it."; return; }
      const number = res.j.documentNumber || (res.j.card && res.j.card.documentNumber) || "";
      const origin = window.location.origin;
      const docAbs = number ? origin+"/x/invoice/invoice/document/"+encodeURIComponent(String(number)) : "";
      showInvoiceDoc(number);
      lastGmail = agentInvoiceGmail(
        user,
        $("i-name").value.trim() || (res.j.card && res.j.card.name) || "",
        $("i-email").value.trim() || (res.j.card && res.j.card.email) || "",
        res.j.amount || ($("i-amount").value ? "$"+$("i-amount").value : ""),
        $("i-notes").value.trim(),
        number || "invoice",
        docAbs,
        payMethod
      );
      const gotPdf = number ? await downloadInvoicePdf(number) : false;
      $("i-out").textContent = gotPdf
        ? "Invoice "+number+" PDF downloaded. Gmail opened — attach "+number+".pdf and send it to the customer. Do not invent a price."
        : "Invoice "+(number||"built")+" is on screen. Download the PDF, then attach it in Gmail. Do not invent a price.";
      if (lastGmail) window.open(lastGmail, "_blank", "noopener");
      } catch (err) {
        $("i-err").textContent = (err && err.message) || "Could not create that invoice.";
        $("i-out").textContent = "The invoice PDF downloads here, then Gmail opens so you can attach it.";
      }
    }
    $("i-ach").addEventListener("click", function(){ makeInvoice("ach"); });
    $("i-card").addEventListener("click", function(){ makeInvoice("card"); });
    $("i-gmail").addEventListener("click", function(){ if(!lastGmail){ $("i-err").textContent="Build the invoice first."; return;} window.open(lastGmail,"_blank","noopener"); });
    $("i-download-pdf").addEventListener("click", function(){ downloadInvoicePdf(); });
    $("i-open-doc").addEventListener("click", function(){ if(!lastDoc){ $("i-err").textContent="Build the invoice first."; return;} window.open(lastDoc,"_blank","noopener"); });
    $("i-print-doc").addEventListener("click", function(){ if(!lastDoc){ $("i-err").textContent="Build the invoice first."; return;} const frame=$("i-preview"); if(frame&&frame.contentWindow) frame.contentWindow.print(); else window.open(lastDoc,"_blank","noopener"); });
    $("i-lookup").addEventListener("click", async function(){
      $("i-err").textContent = "Looking up the last agreed proposal amount…";
      try {
        const res = await api("/x/invoice/invoice/lookup", { method:"POST", body: JSON.stringify({ email:$("i-email").value, phone:$("i-phone").value }), allowError: true });
        if (!res.r.ok || !res.j.ok || !res.j.amount){ $("i-err").textContent = res.j.error || "No agreed proposal amount on that contact."; return; }
        $("i-amount").value = String(res.j.amount);
        if (res.j.name && !$("i-name").value) $("i-name").value = res.j.name;
        $("i-err").textContent = "";
      } catch (err) {
        $("i-err").textContent = (err && err.message) || "No agreed proposal amount on that contact.";
      }
    });
    async function loadInvoices(){
      try {
      const res = await api("/x/invoice/invoice/list", { allowError: true });
      if (!res.r.ok){ $("i-err").textContent = res.j.error || res.j.message || "Could not load invoices."; return; }
      const cards = res.j.cards||[];
      $("i-hits").innerHTML = cards.slice(0,12).map(function(c){
        return '<div class="hit"><strong>'+esc(c.name||"")+" · "+esc(c.documentNumber||c.id||"")+" · "+(c.amount?money(c.amount):"")+"</strong><div>"+esc(c.status||"")+(c.payMethod?" · "+c.payMethod:"")+"</div></div>";
      }).join("") || '<p class="muted">No invoices in this list yet.</p>';
      } catch (err) {
        $("i-err").textContent = (err && err.message) || "Could not load invoices.";
      }
    }
    $("i-list").addEventListener("click", loadInvoices);

    (async function boot(){
      try {
        const res = await api("/session");
        if (user) return;
        if (res.j.ok && res.j.user){ user=res.j.user; greet(user.name); paintTools(user.tools); show("app"); openMod("home"); loadCrm(); }
        else show("login");
      } catch (err) {
        show("login");
      }
    })();
  </script>
</body>
</html>`;
}
