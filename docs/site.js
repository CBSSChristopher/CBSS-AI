const PHONE_DISPLAY = "(870) 323-2593";
const PHONE_TEL = "+18703232593";
const MAIL = ["christopher", "cbshippingsolutions.com"].join("@");

const LINKS = [
  ["Business", "/business"],
  ["Home & farm", "/residential"],
  ["Containers", "/containers"],
  ["Delivery", "/delivery"],
  ["We do it all", "/services"],
  ["About", "/about"],
];

function currentPath() {
  let p = location.pathname.replace(/\/$/, "") || "/";
  p = p.replace(/\.html$/, "");
  if (p === "/index") return "/";
  if (p === "/quote") return "/request";
  return p;
}

function navHtml() {
  const here = currentPath();
  const items = LINKS.map(([label, href]) => {
    const on = here === href;
    return `<a href="${href}"${on ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  return `${items}<a class="btn btn-promo nav-cta" href="/request">Save 20% on delivery</a>`;
}

function markHtml() {
  return `<img class="brand-mark" src="/brand/mark.webp" width="36" height="36" alt="CB Shipping Solutions" />`;
}

function renderChrome() {
  const top = document.getElementById("site-top");
  if (top) {
    const kicker = top.getAttribute("data-kicker") || "Save 20% on delivery";
    top.outerHTML = `
  <div class="topbar">
    <div class="wrap">
      <span>${kicker}</span>
      <span>Call <a data-phone href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a> · <a href="/request">Request information</a></span>
    </div>
  </div>
  <header class="site">
    <div class="wrap">
      <a class="brand" href="/">${markHtml()}<span><strong>CBShippingSolutions</strong><span>CBGC LLC · Business and home</span></span></a>
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
        <div class="footer-brand">
          <img class="footer-stamp" src="/brand/mark.webp" width="72" height="72" alt="" />
          <div>
            <strong>CBGC LLC DBA CBShippingSolutions</strong>
            <p>Business or home. One inclusive price. Save 20% on delivery.</p>
          </div>
        </div>
        <p class="fine">One inclusive price. A person calls you back.</p>
        <img class="bbb-mark" src="/brand/bbb-accredited.webp" width="140" height="51" alt="BBB Accredited Business" />
      </div>
      <div>
        <a href="/business">Business</a><br />
        <a href="/residential">Home & farm</a><br />
        <a href="/containers">Containers</a>
      </div>
      <div>
        <a href="/delivery">Delivery</a><br />
        <a href="/services">We do it all</a><br />
        <a href="/financing">Financing</a><br />
        <a href="/cargotecture">Cargotecture</a><br />
        <a href="/about">About</a>
      </div>
      <div>
        <a href="/request">Request information</a><br />
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

const form = document.getElementById("requestForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("requestMsg");
    const btn = form.querySelector("button[type=submit]");
    const payload = {
      company: document.getElementById("company").value,
      name: document.getElementById("name").value,
      role: document.getElementById("role").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      zip: document.getElementById("zip").value,
      quantity: document.getElementById("quantity").value,
      use: document.getElementById("use").value,
      timeline: document.getElementById("timeline").value,
      notes: document.getElementById("notes").value,
      company_website: document.getElementById("company_website").value,
    };
    if (!payload.name || !payload.phone || !payload.zip || !payload.use) {
      msg.textContent = "Name, phone, site ZIP, and what you need are required.";
      return;
    }
    btn.disabled = true;
    msg.classList.remove("ok");
    msg.textContent = "Sending your request…";
    try {
      const api =
        location.hostname === "cbssweb.cbss.workers.dev"
          ? "/api/request"
          : "https://cbssweb.cbss.workers.dev/api/request";
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        msg.textContent = data.error || "The request did not go through. Call " + PHONE_DISPLAY + ".";
        btn.disabled = false;
        return;
      }
      form.reset();
      msg.classList.add("ok");
      msg.textContent =
        "Received. A person from the office will call you back.";
    } catch {
      msg.textContent = "The request did not go through. Call " + PHONE_DISPLAY + ".";
      btn.disabled = false;
    }
  });
}
