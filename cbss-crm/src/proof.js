// Order proof (schema 1).
// KV key "orderProof" is a map of order key -> record. It is created on the
// first save. Deals, contacts, notes, and follow-ups are not rewritten.
// File bytes go to the PROOF_BUCKET R2 binding (bucket cbss-crm-order-proof).

export const PROOF_KV_KEY = "orderProof";
export const PROOF_SCHEMA = 1;
export const PROOF_BUCKET_NAME = "cbss-crm-order-proof";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_EMBED_BYTES = 1500 * 1024;

export const ATTACHMENT_TYPES = [
  "delivery-photo",
  "delivery-video",
  "signed-invoice",
  "contract",
  "payment",
  "bol",
  "delivery-receipt",
  "customer-signoff",
  "hauler-payment",
  "hauler-ack",
  "other"
];

export const TIMELINE_KINDS = ["paid", "dispatched", "in-transit", "delivered"];

export const COMM_CHANNELS = ["email", "text", "call", "crm-note", "agentmail", "harbor"];

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "application/pdf"
]);

export function proofNormEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return "";
  return e;
}

export function proofNormPhone(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length < 10) return "";
  return d;
}

function maskDigits(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.length <= 4) return "••••";
  return "****" + d.slice(-4);
}

export function redactSensitive(input) {
  let s = String(input == null ? "" : input);
  s = s.replace(
    /\b(account|acct|routing|aba|iban|card(?:\s*number)?|pan|cvv|cvc)\b\s*[:#-]?\s*([0-9][0-9 \-]{2,40})/gi,
    (full, label, num) => {
      const digits = String(num).replace(/\D/g, "");
      if (!digits) return full;
      if (/^cvv|cvc/i.test(label)) return label + " ***";
      return label + " " + maskDigits(digits);
    }
  );
  s = s.replace(/\d[\d \-]{6,}\d/g, (run) => {
    const digits = run.replace(/\D/g, "");
    if (digits.length >= 13) return maskDigits(digits);
    return run;
  });
  return s;
}

export function emptyHauler() {
  return {
    name: "",
    phone: "",
    rate: "",
    amountPaid: "",
    paidDate: "",
    paymentProofId: "",
    acknowledged: false,
    acknowledgedAt: "",
    acknowledgedBy: "",
    note: ""
  };
}

export function emptyProofRecord(key, contactId, dealId) {
  const now = new Date().toISOString();
  return {
    schema: PROOF_SCHEMA,
    key,
    contactId: String(contactId || ""),
    dealId: String(dealId || ""),
    orderRef: "",
    createdAt: now,
    updatedAt: now,
    attachments: [],
    timeline: [],
    communications: [],
    hauler: emptyHauler()
  };
}

export function orderKeyFor(contactId, dealId) {
  const deal = String(dealId || "").trim();
  if (deal) return "d-" + deal;
  const contact = String(contactId || "").trim();
  if (!contact) return "";
  return "c-" + contact;
}

export function newProofId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clip(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function moneyText(value) {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, "").trim());
  if (!Number.isFinite(n)) return clip(value, 40);
  return String(Math.round(n * 100) / 100);
}

export function applyPublicFlag(attachment, input) {
  const next = Object.assign({}, attachment || {});
  const want = input && (input.publicOk === true || input.publicOk === "1" || input.publicOk === "true" || input.publicOk === "on");
  if (!want) {
    next.publicOk = false;
    next.publicCity = "";
    next.publicDate = "";
    return { ok: true, attachment: next };
  }
  if (next.type !== "delivery-photo") {
    return { ok: false, error: "Only delivery photos can be marked OK to show publicly." };
  }
  const city = clip(input.city, 80);
  const date = clip(input.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Public date must be YYYY-MM-DD." };
  }
  if (!city || /@/.test(city) || /\d{6,}/.test(city)) {
    return { ok: false, error: "Public city is required and cannot include a name, email, or phone." };
  }
  next.publicOk = true;
  next.publicCity = city;
  next.publicDate = date;
  return { ok: true, attachment: next };
}

export function publicPhotoFeed(book) {
  const items = [];
  const records = book && typeof book === "object" ? Object.values(book) : [];
  for (const rec of records) {
    const files = rec && Array.isArray(rec.attachments) ? rec.attachments : [];
    for (const file of files) {
      if (!file || file.publicOk !== true || file.type !== "delivery-photo") continue;
      const city = clip(file.publicCity, 80);
      const date = clip(file.publicDate, 10);
      if (!city || !/^\d{4}-\d{2}-\d{2}$/.test(date) || /@/.test(city)) continue;
      items.push({
        id: String(file.id || ""),
        city,
        date,
        kind: "delivery-photo"
      });
    }
  }
  items.sort((a, b) => b.date.localeCompare(a.date) || a.city.localeCompare(b.city));
  return { ok: true, items };
}

export function addTimelineEvent(record, input, actor) {
  const kind = clip(input && input.kind, 40);
  if (!TIMELINE_KINDS.includes(kind)) {
    return { ok: false, error: "Timeline event must be paid, dispatched, in-transit, or delivered." };
  }
  const at = clip(input && (input.at || input.date), 40) || new Date().toISOString();
  const event = {
    id: newProofId("t_"),
    kind,
    at,
    by: clip(actor, 120) || "CRM",
    note: redactSensitive(clip(input && input.note, 2000)),
    proofIds: Array.isArray(input && input.proofIds) ? input.proofIds.map((id) => clip(id, 40)).filter(Boolean).slice(0, 10) : []
  };
  const next = Object.assign({}, record, {
    timeline: (record.timeline || []).concat(event).slice(-100),
    updatedAt: new Date().toISOString()
  });
  return { ok: true, record: next, event };
}

export function setHauler(record, input, actor) {
  const prev = Object.assign(emptyHauler(), record && record.hauler || {});
  const acknowledged = input && (input.acknowledged === true || input.acknowledged === "1" || input.acknowledged === "true" || input.acknowledged === "on");
  const hauler = {
    name: clip(input && input.name, 160),
    phone: clip(input && input.phone, 40),
    rate: moneyText(input && input.rate),
    amountPaid: moneyText(input && input.amountPaid),
    paidDate: clip(input && input.paidDate, 40),
    paymentProofId: clip(input && input.paymentProofId, 40),
    acknowledged: Boolean(acknowledged),
    acknowledgedAt: acknowledged ? (prev.acknowledged ? prev.acknowledgedAt : new Date().toISOString()) : "",
    acknowledgedBy: acknowledged ? (prev.acknowledged ? prev.acknowledgedBy : clip(actor, 120)) : "",
    note: redactSensitive(clip(input && input.note, 2000))
  };
  return {
    ok: true,
    record: Object.assign({}, record, { hauler, updatedAt: new Date().toISOString() })
  };
}

export function addCommunication(record, input, actor) {
  const channel = clip(input && input.channel, 40);
  if (!COMM_CHANNELS.includes(channel)) {
    return { ok: false, error: "Communication channel is not recognized." };
  }
  const summary = redactSensitive(clip(input && input.summary, 2000));
  const externalId = clip(input && input.externalId, 180);
  if (!summary && !externalId) {
    return { ok: false, error: "Add a summary or an existing message id." };
  }
  const item = {
    id: newProofId("m_"),
    channel,
    at: clip(input && input.at, 40) || new Date().toISOString(),
    by: clip(input && input.by, 120) || clip(actor, 120) || "CRM",
    summary,
    externalId,
    direction: clip(input && input.direction, 20)
  };
  const next = Object.assign({}, record, {
    communications: (record.communications || []).concat(item).slice(-200),
    updatedAt: new Date().toISOString()
  });
  return { ok: true, record: next, item };
}

export function noteLinkId(note) {
  const n = note && typeof note === "object" ? note : {};
  return [n.timestamp || "", n.author || "", String(n.text || "").slice(0, 48)].join("|");
}

export function linkCrmNotes(record, notes, actor) {
  const have = new Set((record.communications || []).map((c) => c && c.externalId).filter(Boolean));
  let next = record;
  let linked = 0;
  for (const note of notes || []) {
    const externalId = noteLinkId(note);
    if (!externalId || have.has(externalId)) continue;
    const added = addCommunication(next, {
      channel: "crm-note",
      at: note.timestamp || "",
      by: note.author || actor,
      summary: note.text || "",
      externalId,
      direction: "log"
    }, actor);
    if (!added.ok) continue;
    next = added.record;
    have.add(externalId);
    linked += 1;
  }
  return { ok: true, record: next, linked };
}

export function searchOrders({ contacts, deals, proofBook, query }) {
  const qRaw = String(query || "").trim();
  const q = qRaw.toLowerCase();
  if (!q) return [];
  const qPhone = proofNormPhone(qRaw);
  const qEmail = proofNormEmail(qRaw);
  const proofs = proofBook && typeof proofBook === "object" ? Object.values(proofBook) : [];
  const byContact = new Map();
  const byDeal = new Map();
  for (const rec of proofs) {
    if (!rec || typeof rec !== "object" || !rec.key) continue;
    if (rec.contactId) byContact.set(String(rec.contactId), rec);
    if (rec.dealId) byDeal.set(String(rec.dealId), rec);
  }
  const out = [];
  for (const c of contacts || []) {
    if (!c || c.id == null) continue;
    const contactDeals = (deals || []).filter((d) => d && String(d.contactId) === String(c.id));
    const deal = contactDeals[0] || null;
    const rec = byContact.get(String(c.id)) || (deal && byDeal.get(String(deal.id))) || null;
    const email = proofNormEmail(c.email);
    const phone = proofNormPhone(c.phone);
    let score = 0;
    if (qEmail && email && email === qEmail) score += 100;
    if (qPhone && phone && (phone === qPhone || phone.endsWith(qPhone) || qPhone.endsWith(phone))) score += 100;
    if (contactDeals.some((d) => String(d.id) === qRaw)) score += 90;
    if (rec && String(rec.orderRef || "").toLowerCase() === q) score += 90;
    if (String(c.id) === qRaw) score += 80;
    const hay = [
      c.name, c.email, c.phone, c.company, c.city, c.state, c.zip, c.owner,
      rec && rec.orderRef, rec && rec.key
    ].concat(contactDeals.flatMap((d) => [d.id, d.name]));
    if (hay.some((v) => String(v || "").toLowerCase().includes(q))) score += 10;
    if (!score) continue;
    const proofStarted = Boolean(rec && (
      (rec.attachments && rec.attachments.length) ||
      (rec.timeline && rec.timeline.length) ||
      (rec.communications && rec.communications.length) ||
      (rec.hauler && (rec.hauler.name || rec.hauler.amountPaid || rec.hauler.acknowledged))
    ));
    out.push({
      score,
      contactId: String(c.id),
      dealId: deal ? String(deal.id) : "",
      orderRef: rec && rec.orderRef || "",
      name: c.name || "",
      company: c.company || "",
      email: c.email || "",
      phone: c.phone || "",
      city: c.city || "",
      owner: c.owner || "",
      hasProof: proofStarted,
      proofKey: rec && rec.key || ""
    });
  }
  out.sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
  return out.slice(0, 20);
}

function pdfEscape(s) {
  return redactSensitive(s).replace(/[^\x20-\x7E]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfLine(s) {
  return redactSensitive(String(s == null ? "" : s)).replace(/\s+/g, " ").trim();
}

export function proofPdfLines(model) {
  const m = model || {};
  const c = m.contact || {};
  const d = m.deal || {};
  const rec = m.record || emptyProofRecord("", "", "");
  const lines = [
    "CB Shipping Solutions - order proof packet",
    "Internal dispute file. Card and bank numbers are redacted.",
    "Generated " + pdfLine(m.generatedAt || "") + " by " + pdfLine(m.generatedBy || ""),
    "",
    "Customer",
    "Name: " + pdfLine(c.name),
    "Company: " + pdfLine(c.company),
    "Email: " + pdfLine(c.email),
    "Phone: " + pdfLine(c.phone),
    "City: " + pdfLine([c.city, c.state].filter(Boolean).join(", ")),
    "Contact id: " + pdfLine(c.id),
    "",
    "Order",
    "Deal id: " + pdfLine(d.id || rec.dealId),
    "Order ref: " + pdfLine(rec.orderRef),
    "Deal name: " + pdfLine(d.name),
    "Stage: " + pdfLine(d.stage),
    "Amount: " + pdfLine(d.amount),
    "Container: " + pdfLine(d.container),
    "Payment mode: " + pdfLine(d.payment),
    "Depot: " + pdfLine(d.depot),
    ""
  ];
  lines.push("Status timeline");
  const timeline = rec.timeline || [];
  if (!timeline.length) lines.push("No status events logged.");
  timeline.forEach((ev) => {
    lines.push(pdfLine(ev.at) + "  " + pdfLine(ev.kind) + "  by " + pdfLine(ev.by));
    if (ev.note) lines.push("  " + pdfLine(ev.note));
    if (ev.proofIds && ev.proofIds.length) lines.push("  proof " + ev.proofIds.map(pdfLine).join(", "));
  });
  lines.push("", "Payment records");
  const payments = (rec.attachments || []).filter((f) => f && (f.type === "payment" || f.type === "hauler-payment"));
  if (!payments.length) lines.push("No payment records attached.");
  payments.forEach((f) => {
    const p = f.payment || {};
    lines.push(pdfLine(f.type) + "  " + pdfLine(p.method) + "  " + pdfLine(p.date) + "  " + pdfLine(p.amount));
    if (p.reference) lines.push("  reference " + pdfLine(p.reference));
    lines.push("  file " + pdfLine(f.filename) + "  id " + pdfLine(f.id) + "  (image withheld from this PDF)");
  });
  const h = rec.hauler || emptyHauler();
  lines.push(
    "",
    "Hauler",
    "Name: " + pdfLine(h.name),
    "Phone: " + pdfLine(h.phone),
    "Agreed rate: " + pdfLine(h.rate),
    "Amount paid: " + pdfLine(h.amountPaid),
    "Paid date: " + pdfLine(h.paidDate),
    "Payment proof id: " + pdfLine(h.paymentProofId),
    "Acknowledged: " + (h.acknowledged ? "yes" : "no"),
    "Acknowledged by: " + pdfLine(h.acknowledgedBy) + " " + pdfLine(h.acknowledgedAt),
    "Note: " + pdfLine(h.note)
  );
  lines.push("", "Communications");
  const comms = rec.communications || [];
  if (!comms.length) lines.push("No linked emails, texts, or call logs.");
  comms.forEach((item) => {
    lines.push(pdfLine(item.at) + "  " + pdfLine(item.channel) + "  " + pdfLine(item.direction) + "  " + pdfLine(item.by));
    if (item.externalId) lines.push("  link " + pdfLine(item.externalId));
    if (item.summary) lines.push("  " + pdfLine(item.summary));
  });
  lines.push("", "Attachments");
  const files = rec.attachments || [];
  if (!files.length) lines.push("No files on this order.");
  files.forEach((f) => {
    const pub = f.publicOk ? " public " + pdfLine(f.publicCity) + " " + pdfLine(f.publicDate) : " private";
    lines.push(pdfLine(f.type) + "  " + pdfLine(f.filename) + "  " + pdfLine(f.uploadedAt) + "  " + pdfLine(f.uploadedBy) + pub);
  });
  lines.push("", "Delivery photos in this packet are the files marked as photos. Payment images stay in the CRM.");
  return lines;
}

export function jpegSize(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (u.length < 4 || u[0] !== 0xff || u[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < u.length) {
    if (u[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = u[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (u[i + 2] << 8) | u[i + 3];
    if (len < 2 || i + 2 + len > u.length) return null;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (u[i + 5] << 8) | u[i + 6];
      const width = (u[i + 7] << 8) | u[i + 8];
      if (!width || !height) return null;
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

function u8(s) {
  return new TextEncoder().encode(s);
}

function concatBytes(parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function buildProofPdf(model) {
  const lines = proofPdfLines(model);
  const images = [];
  for (const img of (model && model.images) || []) {
    if (!img || !img.bytes || img.bytes.length > MAX_EMBED_BYTES) continue;
    const size = jpegSize(img.bytes);
    if (!size) continue;
    images.push({
      width: size.width,
      height: size.height,
      bytes: img.bytes,
      label: pdfLine(img.label || "Delivery photo")
    });
  }
  const pageSize = 46;
  const chunks = [];
  for (let i = 0; i < lines.length; i += pageSize) chunks.push(lines.slice(i, i + pageSize));
  if (!chunks.length) chunks.push(["CB Shipping Solutions - order proof packet"]);

  let next = 4;
  const textPages = chunks.map((chunk) => {
    const contentId = next++;
    const pageId = next++;
    const commands = ["BT", "/F1 10 Tf", "13 TL", "48 750 Td"];
    chunk.forEach((line, idx) => {
      const text = pdfEscape(line).slice(0, 180);
      commands.push(idx === 0 ? "(" + text + ") Tj" : "T* (" + text + ") Tj");
    });
    commands.push("ET");
    const stream = commands.join("\n");
    return { contentId, pageId, content: "<< /Length " + u8(stream).length + " >>\nstream\n" + stream + "\nendstream" };
  });
  const imagePages = images.map((img, idx) => {
    const imageId = next++;
    const contentId = next++;
    const pageId = next++;
    const scale = Math.min(500 / img.width, 640 / img.height, 4);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const x = Math.round((612 - w) / 2);
    const y = Math.max(72, Math.round((792 - h) / 2));
    const label = pdfEscape(img.label).slice(0, 140);
    const stream = "q\n" + w + " 0 0 " + h + " " + x + " " + y + " cm\n/Im" + idx + " Do\nQ\nBT /F1 10 Tf 48 40 Td (" + label + ") Tj ET";
    return { imageId, contentId, pageId, img, idx, stream };
  });
  const kids = textPages.map((p) => p.pageId).concat(imagePages.map((p) => p.pageId));
  const catalog = "<< /Type /Catalog /Pages 2 0 R >>";
  const pages = "<< /Type /Pages /Count " + kids.length + " /Kids [" + kids.map((id) => id + " 0 R").join(" ") + "] >>";
  const font = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  const parts = [u8("%PDF-1.4\n")];
  const offsets = [];
  function addObj(n, body) {
    offsets[n] = parts.reduce((sum, p) => sum + p.length, 0);
    const payload = typeof body === "string" ? u8(body) : body;
    parts.push(u8(n + " 0 obj\n"), payload, u8("\nendobj\n"));
  }
  addObj(1, catalog);
  addObj(2, pages);
  addObj(3, font);
  for (const page of textPages) {
    addObj(page.contentId, page.content);
    addObj(page.pageId, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents " + page.contentId + " 0 R >>");
  }
  for (const page of imagePages) {
    const header = u8("<< /Type /XObject /Subtype /Image /Width " + page.img.width + " /Height " + page.img.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + page.img.bytes.length + " >>\nstream\n");
    addObj(page.imageId, concatBytes([header, page.img.bytes, u8("\nendstream")]));
    addObj(page.contentId, "<< /Length " + u8(page.stream).length + " >>\nstream\n" + page.stream + "\nendstream");
    addObj(page.pageId, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> /XObject << /Im" + page.idx + " " + page.imageId + " 0 R >> >> /Contents " + page.contentId + " 0 R >>");
  }
  const xrefStart = parts.reduce((sum, p) => sum + p.length, 0);
  let xref = "xref\n0 " + next + "\n0000000000 65535 f \n";
  for (let n = 1; n < next; n++) {
    xref += String(offsets[n]).padStart(10, "0") + " 00000 n \n";
  }
  xref += "trailer\n<< /Size " + next + " /Root 1 0 R >>\nstartxref\n" + xrefStart + "\n%%EOF\n";
  parts.push(u8(xref));
  return concatBytes(parts);
}

function safeFilename(name) {
  const base = String(name || "file").split(/[/\\]/).pop();
  const clean = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 80);
  return clean || "file";
}

function actorName(user) {
  return clip(user && (user.name || user.email), 120) || "CRM";
}

async function loadBook(store) {
  const raw = await store.get(PROOF_KV_KEY, { type: "json" });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

async function saveBook(store, book) {
  await store.setJSON(PROOF_KV_KEY, book);
}

function findContact(contacts, contactId) {
  if (contactId == null || contactId === "") return null;
  return (contacts || []).find((c) => c && String(c.id) === String(contactId)) || null;
}

function findDeal(deals, contactId, dealId) {
  const list = Array.isArray(deals) ? deals : [];
  if (dealId) {
    const hit = list.find((d) => d && String(d.id) === String(dealId));
    if (hit) return hit;
  }
  if (contactId) return list.find((d) => d && String(d.contactId) === String(contactId)) || null;
  return null;
}

function notesFor(contact, state) {
  const fromContact = contact && Array.isArray(contact.notes) ? contact.notes : [];
  const map = state && state.notes && typeof state.notes === "object" ? state.notes : {};
  const extra = contact && (map[contact.id] || map[String(contact.id)]);
  if (!Array.isArray(extra)) return fromContact;
  const seen = new Set(fromContact.map(noteLinkId));
  return fromContact.concat(extra.filter((n) => n && !seen.has(noteLinkId(n))));
}

function relocateContactProof(book, contactId, deal) {
  if (!deal || deal.id == null) return book;
  const from = "c-" + String(contactId);
  const to = "d-" + String(deal.id);
  if (!book[from] || book[to]) return book;
  const rec = Object.assign({}, book[from], { key: to, dealId: String(deal.id), contactId: String(contactId) });
  const next = Object.assign({}, book);
  next[to] = rec;
  delete next[from];
  return next;
}

function recordFor(book, contact, deal) {
  const contactId = contact && contact.id != null ? String(contact.id) : "";
  const dealId = deal && deal.id != null ? String(deal.id) : "";
  const key = orderKeyFor(contactId, dealId);
  if (key && book[key]) return { book, key, record: book[key] };
  if (contactId && book["c-" + contactId] && !dealId) return { book, key: "c-" + contactId, record: book["c-" + contactId] };
  return { book, key, record: null };
}

async function directory(env, deps) {
  const store = deps.openStore(env);
  const archive = await deps.loadArchive(store);
  const state = await deps.readState(store);
  if (deps.applyApprovedArchives) deps.applyApprovedArchives(state);
  const contacts = Array.isArray(archive) ? archive.slice() : [];
  if (deps.applyEdits) {
    deps.applyEdits(contacts, state.contactEdits);
    deps.applyEdits(state.contactsAdded, state.contactEdits);
  }
  const seen = new Set(contacts.map((c) => c && String(c.id)));
  for (const c of state.contactsAdded || []) {
    if (c && !seen.has(String(c.id))) contacts.push(c);
  }
  if (deps.attachStoredNotes) deps.attachStoredNotes(contacts, state.notes);
  return { store, state, contacts };
}

function dealView(deal) {
  if (!deal) return null;
  return {
    id: deal.id,
    contactId: deal.contactId,
    name: deal.name || "",
    stage: deal.stage || "",
    amount: deal.amount === undefined ? "" : deal.amount,
    container: deal.container || "",
    depot: deal.depot || "",
    payment: deal.payment || ""
  };
}

function contactView(contact) {
  if (!contact) return null;
  return {
    id: contact.id,
    name: contact.name || "",
    company: contact.company || "",
    email: contact.email || "",
    phone: contact.phone || "",
    city: contact.city || "",
    state: contact.state || "",
    owner: contact.owner || ""
  };
}

function json(deps, request, status, body) {
  return deps.jsonResponse(request, status, body);
}

function fileHeaders(deps, request, contentType, extra) {
  const cors = deps.corsHeaders(request, { "Content-Type": contentType || "application/octet-stream" });
  const headers = new Headers();
  Object.entries(cors).forEach(([k, v]) => {
    if (v != null && k.toLowerCase() !== "set-cookie") headers.set(k, v);
  });
  Object.entries(extra || {}).forEach(([k, v]) => {
    if (v != null) headers.set(k, v);
  });
  return headers;
}

async function r2Bytes(obj) {
  if (!obj) return null;
  if (typeof obj.arrayBuffer === "function") return new Uint8Array(await obj.arrayBuffer());
  if (obj.body && typeof obj.body.arrayBuffer === "function") return new Uint8Array(await obj.body.arrayBuffer());
  if (obj.body instanceof Uint8Array) return obj.body;
  return null;
}

function findAttachment(book, id) {
  const want = String(id || "");
  if (!want) return null;
  for (const rec of Object.values(book || {})) {
    const hit = (rec && rec.attachments || []).find((f) => f && String(f.id) === want);
    if (hit) return { record: rec, attachment: hit };
  }
  return null;
}

async function readPacketImages(bucket, record) {
  if (!bucket || !record) return [];
  const images = [];
  for (const file of record.attachments || []) {
    if (!file || file.type !== "delivery-photo") continue;
    if (!/^image\/jpe?g$/i.test(file.contentType || "")) continue;
    if (images.length >= 8) break;
    const obj = await bucket.get(file.r2Key);
    const bytes = await r2Bytes(obj);
    if (!bytes || bytes.length > MAX_EMBED_BYTES) continue;
    images.push({ bytes, label: "Delivery photo " + (file.publicCity || file.id || "") });
  }
  return images;
}

export async function handleOrderProof(request, env, deps) {
  const url = new URL(request.url);
  const path = deps.normalizePath(url.pathname);
  const isPublic = path === "/order-proof/public" || path === "/order-proof/public-file";
  if (isPublic && request.method !== "GET") {
    return json(deps, request, 405, { error: "Method not allowed" });
  }
  let user = null;
  if (!isPublic) {
    user = await deps.requireSession(request, env);
    if (!user) return json(deps, request, 401, { error: "Unauthorized" });
  }
  const store = deps.openStore(env);
  if (path === "/order-proof/public" && request.method === "GET") {
    const book = await loadBook(store);
    const feed = publicPhotoFeed(book);
    return json(deps, request, 200, feed);
  }
  if (path === "/order-proof/public-file" && request.method === "GET") {
    const book = await loadBook(store);
    const found = findAttachment(book, url.searchParams.get("id"));
    const file = found && found.attachment;
    const bucket = env && env.PROOF_BUCKET;
    if (!file || file.publicOk !== true || file.type !== "delivery-photo" || !bucket) {
      return json(deps, request, 404, { error: "Not found" });
    }
    const obj = await bucket.get(file.r2Key);
    const bytes = await r2Bytes(obj);
    if (!bytes) return json(deps, request, 404, { error: "Not found" });
    const type = /^image\//i.test(file.contentType || "") ? file.contentType : "application/octet-stream";
    return new Response(bytes, {
      status: 200,
      headers: fileHeaders(deps, request, type, {
        "Content-Disposition": "inline; filename=\"delivery.jpg\"",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      })
    });
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return json(deps, request, 405, { error: "Method not allowed" });
  }

  const dir = await directory(env, deps);
  if (path === "/order-proof/lookup" && request.method === "GET") {
    const book = await loadBook(dir.store);
    const matches = searchOrders({
      contacts: dir.contacts,
      deals: dir.state.deals,
      proofBook: book,
      query: url.searchParams.get("q") || ""
    });
    return json(deps, request, 200, { ok: true, matches });
  }

  let body = {};
  let upload = null;
  if (request.method === "POST" && path === "/order-proof/upload") {
    const form = await request.formData();
    upload = form;
    body = {
      contactId: form.get("contactId"),
      dealId: form.get("dealId"),
      type: form.get("type"),
      note: form.get("note"),
      publicOk: form.get("publicOk"),
      city: form.get("city"),
      date: form.get("date"),
      paymentMethod: form.get("paymentMethod"),
      paymentDate: form.get("paymentDate"),
      paymentAmount: form.get("paymentAmount"),
      paymentReference: form.get("paymentReference")
    };
  } else if (request.method === "POST") {
    const raw = await request.text();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch (_) {
        return json(deps, request, 400, { error: "Expected JSON" });
      }
    }
  }

  const contactId = String(body.contactId || url.searchParams.get("contactId") || "").trim();
  const dealIdParam = String(body.dealId || url.searchParams.get("dealId") || "").trim();
  const contact = findContact(dir.contacts, contactId);
  const deal = findDeal(dir.state.deals, contact ? contact.id : contactId, dealIdParam);
  if (!contact && !deal) return json(deps, request, 404, { error: "Order not found" });

  let book = await loadBook(dir.store);
  book = relocateContactProof(book, (contact && contact.id) || contactId, deal);
  let located = recordFor(book, contact, deal);
  book = located.book;

  async function persist(record) {
    const key = record.key || located.key;
    book = Object.assign({}, book, { [key]: record });
    await saveBook(dir.store, book);
    located = { book, key, record };
    return record;
  }

  function ensureRecord() {
    if (located.record) return located.record;
    const cid = contact ? contact.id : (deal && deal.contactId) || "";
    const did = deal ? deal.id : "";
    const key = orderKeyFor(cid, did);
    return emptyProofRecord(key, cid, did);
  }

  if (path === "/order-proof/packet" && request.method === "GET") {
    const record = ensureRecord();
    const images = await readPacketImages(env && env.PROOF_BUCKET, record);
    const pdf = buildProofPdf({
      generatedAt: new Date().toISOString(),
      generatedBy: actorName(user),
      contact: contactView(contact) || { id: contactId },
      deal: dealView(deal) || { id: dealIdParam },
      record,
      images
    });
    const name = "cbss-proof-" + (deal ? deal.id : contactId || "order") + ".pdf";
    return new Response(pdf, {
      status: 200,
      headers: fileHeaders(deps, request, "application/pdf", {
        "Content-Disposition": "attachment; filename=\"" + name.replace(/[^A-Za-z0-9._-]/g, "") + "\"",
        "Cache-Control": "private, no-store"
      })
    });
  }

  if (path === "/order-proof/file" && request.method === "GET") {
    const found = findAttachment(book, url.searchParams.get("id"));
    const bucket = env && env.PROOF_BUCKET;
    if (!found || !bucket) return json(deps, request, 404, { error: "File not found" });
    const sameOrder = found.record && (String(found.record.contactId) === String(contactId) || String(found.record.dealId) === String(deal && deal.id || dealIdParam));
    if (!sameOrder) return json(deps, request, 404, { error: "File not found" });
    const obj = await bucket.get(found.attachment.r2Key);
    const bytes = await r2Bytes(obj);
    if (!bytes) return json(deps, request, 404, { error: "File not found" });
    const filename = safeFilename(found.attachment.filename);
    return new Response(bytes, {
      status: 200,
      headers: fileHeaders(deps, request, found.attachment.contentType || "application/octet-stream", {
        "Content-Disposition": "attachment; filename=\"" + filename + "\"",
        "Cache-Control": "private, no-store"
      })
    });
  }

  if (request.method === "GET") {
    return json(deps, request, 200, {
      ok: true,
      bucketReady: Boolean(env && env.PROOF_BUCKET),
      record: located.record,
      contact: contactView(contact),
      deal: dealView(deal)
    });
  }

  const action = path === "/order-proof/upload" ? "upload" : clip(body.action || "ensure", 40);
  let record = ensureRecord();

  if (action === "ensure") {
    record = await persist(record);
  } else if (action === "setOrderRef") {
    record = Object.assign({}, record, { orderRef: clip(body.orderRef, 80), updatedAt: new Date().toISOString() });
    record = await persist(record);
  } else if (action === "addTimeline") {
    const added = addTimelineEvent(record, body, actorName(user));
    if (!added.ok) return json(deps, request, 400, added);
    record = await persist(added.record);
  } else if (action === "setHauler") {
    record = await persist(setHauler(record, body.hauler || body, actorName(user)).record);
  } else if (action === "addCommunication") {
    const added = addCommunication(record, body.communication || body, actorName(user));
    if (!added.ok) return json(deps, request, 400, added);
    record = await persist(added.record);
  } else if (action === "linkCrmNotes") {
    const linked = linkCrmNotes(record, notesFor(contact, dir.state), actorName(user));
    record = await persist(linked.record);
  } else if (action === "setPublic") {
    const id = clip(body.attachmentId, 40);
    const idx = (record.attachments || []).findIndex((f) => f && f.id === id);
    if (idx < 0) return json(deps, request, 404, { error: "Attachment not found" });
    const flagged = applyPublicFlag(record.attachments[idx], body);
    if (!flagged.ok) return json(deps, request, 400, flagged);
    const attachments = record.attachments.slice();
    attachments[idx] = flagged.attachment;
    record = await persist(Object.assign({}, record, { attachments, updatedAt: new Date().toISOString() }));
  } else if (action === "removeAttachment") {
    const id = clip(body.attachmentId, 40);
    const target = (record.attachments || []).find((f) => f && f.id === id);
    if (!target) return json(deps, request, 404, { error: "Attachment not found" });
    if (env && env.PROOF_BUCKET && target.r2Key) {
      try { await env.PROOF_BUCKET.delete(target.r2Key); } catch (_) {}
    }
    record = await persist(Object.assign({}, record, {
      attachments: record.attachments.filter((f) => f && f.id !== id),
      updatedAt: new Date().toISOString()
    }));
  } else if (action === "upload") {
    const bucket = env && env.PROOF_BUCKET;
    if (!bucket) {
      return json(deps, request, 503, {
        error: "PROOF_BUCKET is not configured. Create R2 bucket " + PROOF_BUCKET_NAME + " and bind it as PROOF_BUCKET.",
        code: "PROOF_BUCKET_NOT_CONFIGURED"
      });
    }
    const type = clip(body.type, 40);
    if (!ATTACHMENT_TYPES.includes(type)) return json(deps, request, 400, { error: "Unknown attachment type" });
    const file = upload && upload.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return json(deps, request, 400, { error: "File required" });
    if (file.size > MAX_UPLOAD_BYTES) return json(deps, request, 400, { error: "File is larger than 25 MB" });
    const contentType = clip(file.type || "application/octet-stream", 80).toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) return json(deps, request, 400, { error: "File type is not allowed" });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const id = newProofId("p_");
    const filename = safeFilename(file.name);
    const r2Key = "proof/" + record.key + "/" + id + "/" + filename;
    const uploadedAt = new Date().toISOString();
    let attachment = {
      id,
      type,
      filename,
      contentType,
      size: bytes.length,
      r2Key,
      uploadedAt,
      uploadedBy: actorName(user),
      note: redactSensitive(clip(body.note, 500)),
      publicOk: false,
      publicCity: "",
      publicDate: ""
    };
    if (type === "payment" || type === "hauler-payment") {
      attachment.payment = {
        method: clip(body.paymentMethod, 40),
        date: clip(body.paymentDate, 40),
        amount: moneyText(body.paymentAmount),
        reference: redactSensitive(clip(body.paymentReference, 80))
      };
    }
    if (type === "delivery-photo" && (body.publicOk === "1" || body.publicOk === "true" || body.publicOk === "on")) {
      const flagged = applyPublicFlag(attachment, {
        publicOk: true,
        city: body.city || (contact && contact.city) || "",
        date: body.date || uploadedAt.slice(0, 10)
      });
      if (!flagged.ok) return json(deps, request, 400, flagged);
      attachment = flagged.attachment;
    }
    await bucket.put(r2Key, bytes, { httpMetadata: { contentType } });
    record = await persist(Object.assign({}, record, {
      attachments: (record.attachments || []).concat(attachment).slice(-40),
      updatedAt: new Date().toISOString()
    }));
  } else {
    return json(deps, request, 400, { error: "Unknown action", action });
  }

  return json(deps, request, 200, {
    ok: true,
    bucketReady: Boolean(env && env.PROOF_BUCKET),
    record,
    contact: contactView(contact),
    deal: dealView(deal)
  });
}
