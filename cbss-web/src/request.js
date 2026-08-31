export const OFFICE_MAIL = ["christopher", "cbshippingsolutions.com"].join("@");

export const USES = [
  "Jobsite storage",
  "Warehouse / overflow",
  "Plant / industrial",
  "Construction office or crib",
  "Multi-unit commercial order",
  "Modified or specialized unit",
  "Chassis or military-grade",
  "Residential / farm storage",
  "Cargotecture / foundation",
  "Import / export",
  "Box construction / modification",
  "Not sure — call me",
];

const TIMELINES = ["ASAP", "This month", "This quarter", "Planning"];

export function officeMail() {
  return OFFICE_MAIL;
}

function clean(value, max = 400) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseInquiry(input) {
  const company = clean(input.company, 120);
  const name = clean(input.name, 80);
  const role = clean(input.role, 80);
  const phone = clean(input.phone, 40);
  const email = clean(input.email, 120);
  const zip = clean(input.zip, 12);
  const quantity = clean(input.quantity, 40);
  const use = clean(input.use, 80);
  const timeline = clean(input.timeline, 40);
  const notes = clean(input.notes, 1200);
  const honey = clean(input.company_website, 80);
  return { company, name, role, phone, email, zip, quantity, use, timeline, notes, honey };
}

export function validateInquiry(data) {
  if (data.honey) return "Ignore this request.";
  if (!data.name || !data.phone || !data.zip || !data.use) {
    return "Name, phone, site ZIP, and what you need are required.";
  }
  if (!USES.includes(data.use)) return "Pick what you need from the list.";
  if (data.timeline && !TIMELINES.includes(data.timeline)) return "Pick a timeline from the list.";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "That email does not look usable.";
  return "";
}

export function crmIngestBody(data, id) {
  return {
    action: "ingestWebsiteLead",
    requestId: id || "",
    company: data.company || "",
    name: data.name || "",
    role: data.role || "",
    phone: data.phone || "",
    email: data.email || "",
    zip: data.zip || "",
    quantity: data.quantity || "",
    use: data.use || "",
    timeline: data.timeline || "",
    notes: data.notes || "",
  };
}

export function collectionResult({ stored, emailed, crmOk }) {
  const kept = Boolean(stored || emailed || crmOk);
  return {
    ok: kept,
    stored: Boolean(stored),
    emailed: Boolean(emailed),
    crm: Boolean(crmOk),
    error: kept ? "" : "The request did not go through. Call the office.",
  };
}

export function inquiryText(data, id) {
  return [
    "Information request from cbshippingsolutions.app",
    id ? "Request id: " + id : "",
    "",
    "Company: " + data.company,
    "Name: " + data.name,
    "Role: " + data.role,
    "Phone: " + data.phone,
    "Email: " + data.email,
    "Site ZIP: " + data.zip,
    "Quantity: " + data.quantity,
    "Need: " + data.use,
    "Timeline: " + data.timeline,
    "Notes: " + data.notes,
    "",
    "Do not invent a price. Call them back with one inclusive number.",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");
}
