const PHONE_DISPLAY = "(573) 525-8324";
const PHONE_TEL = "+15735258324";
const MAIL = ["christopher", "cbshippingsolutions.com"].join("@");

const LINKS = [
  ["Containers", "/containers.html"],
  ["Delivery", "/delivery.html"],
  ["Financing", "/financing.html"],
  ["Cargotecture", "/cargotecture.html"],
  ["Basics", "/basics.html"],
  ["About", "/about.html"],
];

function currentPath() {
  const p = location.pathname.replace(/\/$/, "") || "/";
  return p === "/index.html" ? "/" : p;
}

function navHtml() {
  const here = currentPath();
  const items = LINKS.map(([label, href]) => {
    const on = here === href || (href !== "/" && here.endsWith(href));
    return `<a href="${href}"${on ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  return `${items}<a class="btn btn-navy nav-cta" href="/quote.html">Get a quote</a>`;
}

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
    if (!name || !phone || !zip || !need) {
      document.getElementById("quoteMsg").textContent = "Type your name, phone, ZIP, and what you need.";
      return;
    }
    const body = [
      "Quote request from cbshippingsolutions.app",
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
    document.getElementById("quoteMsg").textContent =
      "Your email app should open with the request. You can also call " + PHONE_DISPLAY + ".";
  });
}
