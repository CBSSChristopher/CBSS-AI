const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("composer");
const inputEl = document.getElementById("input");
const sendEl = document.getElementById("send");
const statusEl = document.getElementById("status");

function addMessage(text, who, meta) {
  const el = document.createElement("div");
  el.className = `msg msg--${who}`;
  el.textContent = text;
  if (meta && meta.intent) {
    const metaEl = document.createElement("div");
    metaEl.className = "msg__meta";
    metaEl.textContent = meta.intent;
    el.appendChild(metaEl);
  }
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.status === "ok") {
      statusEl.textContent = `online · v${data.version}`;
      statusEl.className = "status status--ok";
      return;
    }
    throw new Error("bad status");
  } catch (err) {
    statusEl.textContent = "offline";
    statusEl.className = "status status--err";
  }
}

async function sendMessage(message) {
  addMessage(message, "user");
  sendEl.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    addMessage(data.reply, "bot", { intent: data.intent });
  } catch (err) {
    addMessage("Sorry, I couldn't reach the server.", "bot", { intent: "error" });
  } finally {
    sendEl.disabled = false;
    inputEl.focus();
  }
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = inputEl.value.trim();
  if (!message) return;
  inputEl.value = "";
  sendMessage(message);
});

checkHealth();
addMessage(
  "Hi! I'm CBSS-AI. Try: 'what is 12 * (3 + 4)', 'reverse hello', 'sentiment: I love this', or 'help'.",
  "bot",
  { intent: "welcome" }
);
