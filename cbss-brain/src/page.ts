export function pageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CBSS Brain</title>
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
    body {
      font-family: Georgia, "Times New Roman", Times, serif;
      background: var(--paper);
      color: var(--navy);
    }
    header {
      background: var(--navy);
      color: var(--white);
      padding: 16px 20px 14px;
    }
    header strong { display: block; font-size: 15px; letter-spacing: .04em; }
    header span { display: block; color: #B8C4D0; font-size: 12px; margin-top: 4px; }
    main { max-width: 720px; margin: 0 auto; padding: 20px 16px 28px; }
    .card {
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 18px;
    }
    h1 { font-size: 22px; margin: 0 0 8px; color: var(--accent); }
    p { line-height: 1.45; }
    .muted { color: var(--muted); font-size: 14px; }
    label { display: block; font-size: 13px; font-weight: 700; margin: 12px 0 6px; }
    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      font: 16px/1.4 Georgia, serif;
      color: var(--navy);
      background: #fff;
    }
    button {
      font: 700 15px Georgia, serif;
      border: 0;
      border-radius: 8px;
      padding: 12px 16px;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
    }
    button.secondary { background: transparent; color: var(--accent); border: 1px solid var(--line); }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .err { color: #8A1F1F; font-size: 14px; min-height: 1.2em; }
    #app[data-view="chat"] #login, #app[data-view="login"] #chat { display: none; }
    .log { display: flex; flex-direction: column; gap: 10px; min-height: 42vh; margin: 12px 0; }
    .bubble {
      max-width: 92%;
      padding: 10px 12px;
      border-radius: 10px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .me { align-self: flex-end; background: #E8F0F7; }
    .bot { align-self: flex-start; background: #E8F5EE; border: 1px solid #C8E4D4; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 0; }
    .chips button {
      background: #fff;
      color: var(--navy);
      border: 1px solid var(--line);
      font-weight: 400;
      font-size: 13px;
      padding: 8px 10px;
    }
    #composer { display: flex; gap: 8px; align-items: flex-end; }
    #composer textarea { min-height: 52px; resize: vertical; }
    footer { margin-top: 16px; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <strong>CB SHIPPING SOLUTIONS</strong>
    <span>Team Brain — not for customers</span>
  </header>
  <main>
    <div id="app" data-view="login">
      <section id="login" class="card">
        <h1>CBSS Brain</h1>
        <p class="muted">Team page. Ask how we sell, what to put in the CRM, and when to text Christopher. This page will not give a price or send email.</p>
        <form id="login-form">
          <label for="password">Team password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
          <div class="row">
            <button type="submit">Open Brain</button>
          </div>
          <p class="err" id="login-err"></p>
        </form>
      </section>

      <section id="chat">
        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:center">
            <h1 style="margin:0">Ask the Brain</h1>
            <button type="button" class="secondary" id="out">Sign out</button>
          </div>
          <p class="muted">No prices. No sending. If they want a number, take the lead and text Christopher at 870-323-2593.</p>
          <div class="chips">
            <button type="button" data-q="What is Cargo Worthy vs Wind and Watertight?">CW vs WWT</button>
            <button type="button" data-q="What do I put in the CRM for a new lead?">CRM notes</button>
            <button type="button" data-q="The customer wants a price right now. What do I say?">They want a price</button>
            <button type="button" data-q="What is Flex Buy in one sentence, with no numbers?">Flex Buy</button>
          </div>
          <div class="log" id="log"></div>
          <form id="ask">
            <div id="composer">
              <textarea id="q" rows="2" placeholder="Ask how we do it…" required></textarea>
              <button type="submit">Ask</button>
            </div>
            <p class="err" id="chat-err"></p>
          </form>
        </div>
        <footer>CBGC LLC DBA CBShippingSolutions · Text Christopher 870-323-2593 · Backup 870-682-3867</footer>
      </section>
    </div>
  </main>
  <script>
    const app = document.getElementById("app");
    const log = document.getElementById("log");
    const history = [];

    function bubble(role, text) {
      const d = document.createElement("div");
      d.className = "bubble " + (role === "user" ? "me" : "bot");
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    async function boot() {
      const r = await fetch("/session", { credentials: "same-origin" });
      const j = await r.json();
      app.dataset.view = j.ok ? "chat" : "login";
      if (j.ok && !log.childElementCount) {
        bubble("assistant", "I am the CBSS Brain. Ask me how we sell. I will not give a price. Christopher closes.");
      }
    }

    document.getElementById("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("login-err");
      err.textContent = "";
      const password = document.getElementById("password").value;
      const r = await fetch("/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        err.textContent = j.error || "Could not sign in.";
        return;
      }
      document.getElementById("password").value = "";
      app.dataset.view = "chat";
      log.innerHTML = "";
      history.length = 0;
      bubble("assistant", "I am the CBSS Brain. Ask me how we sell. I will not give a price. Christopher closes.");
    });

    document.getElementById("out").addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      history.length = 0;
      log.innerHTML = "";
      app.dataset.view = "login";
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
      if (r.status === 401) {
        app.dataset.view = "login";
        err.textContent = "Sign in again.";
        return;
      }
      if (!r.ok) {
        err.textContent = j.error || "Try again.";
        return;
      }
      const reply = j.reply || "";
      history.push({ role: "assistant", content: reply });
      bubble("assistant", reply);
    }

    document.getElementById("ask").addEventListener("submit", (e) => {
      e.preventDefault();
      ask(document.getElementById("q").value);
    });
    document.querySelectorAll(".chips button").forEach((b) => {
      b.addEventListener("click", () => ask(b.getAttribute("data-q")));
    });
    boot();
  </script>
</body>
</html>`;
}
