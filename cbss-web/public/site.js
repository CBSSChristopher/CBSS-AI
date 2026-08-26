const PHONE_DISPLAY = "(573) 525-8324";
const PHONE_TEL = "+15735258324";
const MAIL = ["christopher", "cbshippingsolutions.com"].join("@");
const HOST = "https://cbshippingsolutions.app";

const LINKS = [
  ["Containers", "/containers"],
  ["Delivery", "/delivery"],
  ["Financing", "/financing"],
  ["Cargotecture", "/cargotecture"],
  ["Basics", "/basics"],
  ["About", "/about"],
];

function currentPath() {
  let p = location.pathname.replace(/\/$/, "") || "/";
  p = p.replace(/\.html$/, "");
  return p === "/index" ? "/" : p;
}

function navHtml() {
  const here = currentPath();
  const items = LINKS.map(([label, href]) => {
    const on = here === href;
    return `<a href="${href}"${on ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  return `${items}<a class="btn btn-navy nav-cta" href="/quote">Get a quote</a>`;
}

function markSvg() {
  return `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="8" fill="#0B1220"/><rect x="10" y="18" width="44" height="28" rx="2" fill="#C4A35A"/><rect x="10" y="18" width="8" height="28" fill="#1F4E79"/><rect x="46" y="18" width="8" height="28" fill="#1F4E79"/><path d="M18 32h28" stroke="#0B1220" stroke-width="2"/></svg>`;
}

function renderChrome() {
  const top = document.getElementById("site-top");
  if (top) {
    const kicker = top.getAttribute("data-kicker") || "Accredited by the Better Business Bureau";
    top.outerHTML = `
  <div class="topbar">
    <div class="wrap">
      <span>${kicker}</span>
      <span>Call <a data-phone href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a> · <a href="/quote">Request a quote</a></span>
    </div>
  </div>
  <header class="site">
    <div class="wrap">
      <a class="brand" href="/">${markSvg()}<span><strong>CBShippingSolutions</strong><span>CBGC LLC · Delivered cash</span></span></a>
      <button class="btn btn-line menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="siteNav">Menu</button>
      <nav id="siteNav" data-nav></nav>
    </div>
  </header>`;
  }

  const foot = document.getElementById("site-foot");
  if (foot) {
    foot.outerHTML = `
  <footer class="site">
    <div class="wrap">
      <div>
        <strong>CBGC LLC DBA CBShippingSolutions</strong>
        <p>Delivered shipping containers, rent-to-own, and cargotecture.</p>
        <p class="fine">We do not invent a wholesale or a catalog price on this site.</p>
      </div>
      <div>
        <a href="/containers">Containers</a><br />
        <a href="/delivery">Delivery</a><br />
        <a href="/financing">Financing</a>
      </div>
      <div>
        <a href="/cargotecture">Cargotecture</a><br />
        <a href="/basics">Basics</a><br />
        <a href="/about">About</a>
      </div>
      <div>
        <a href="/quote">Get a quote</a><br />
        <a data-phone href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a><br />
        <a data-mail></a><br />
        <span class="fine">cbshippingsolutions.app</span>
      </div>
    </div>
  </footer>`;
  }
}

renderChrome();

document.querySelectorAll("[data-nav]").forEach((el) => {
  el.innerHTML = navHtml();
});
document.querySelectorAll("[data-phone]").forEach((el) => {
  el.textContent = PHONE_DISPLAY;
  if (el.tagName === "A") el.href = "tel:" + PHONE_TEL;
});
document.querySelectorAll("[data-mail]").forEach((el) => {
  el.textContent = MAIL;
  if (el.tagName === "A") el.href = "mailto:" + MAIL;
});

const toggle = document.getElementById("menuBtn");
const nav = document.getElementById("siteNav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
  });
}

const form = document.getElementById("quoteForm");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const get = (id) => (document.getElementById(id).value || "").trim();
    const name = get("name");
    const phone = get("phone");
    const email = get("email");
    const zip = get("zip");
    const need = get("need");
    const notes = get("notes");
    const msg = document.getElementById("quoteMsg");
    if (!name || !phone || !zip || !need) {
      msg.textContent = "Type your name, phone, ZIP, and what you need.";
      return;
    }
    const body = [
      "Quote request from " + HOST.replace("https://", ""),
      "",
      "Name: " + name,
      "Phone: " + phone,
      "Email: " + email,
      "ZIP: " + zip,
      "Need: " + need,
      "Notes: " + notes,
      "",
      "Do not invent a price. Call them back with a real quote.",
    ].join("\n");
    const url =
      "mailto:" +
      encodeURIComponent(MAIL) +
      "?subject=" +
      encodeURIComponent("Website quote · " + name + " · " + zip) +
      "&body=" +
      encodeURIComponent(body);
    window.location.href = url;
    msg.textContent =
      "Your email app should open with the request. If it does not, call " + PHONE_DISPLAY + " and we will quote you.";
  });
}
