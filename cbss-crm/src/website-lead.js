export function websiteLeadNote(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  return [
    "Website request from cbshippingsolutions.app",
    p.requestId ? "Request id: " + String(p.requestId) : "",
    "",
    "Company: " + String(p.company || ""),
    "Name: " + String(p.name || p.customerName || ""),
    "Role: " + String(p.role || ""),
    "Phone: " + String(p.phone || ""),
    "Email: " + String(p.email || ""),
    "Site ZIP: " + String(p.zip || ""),
    "Quantity: " + String(p.quantity || ""),
    "Need: " + String(p.use || ""),
    "Timeline: " + String(p.timeline || ""),
    "Notes: " + String(p.notes || ""),
    "",
    "Do not invent a price. Call them back with one inclusive number."
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");
}

export function websiteLeadPayload(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const name = String(p.name || p.customerName || "").trim();
  const phone = String(p.phone || "").trim();
  const zip = String(p.zip || "").trim();
  const use = String(p.use || "").trim();
  if (!name || !phone || !zip || !use) {
    return { error: "Name, phone, site ZIP, and what you need are required." };
  }
  const residential = /residential|farm|cargotecture|homestead|home/i.test(use);
  return {
    name,
    company: String(p.company || "").trim(),
    email: String(p.email || "").trim(),
    phone,
    zip,
    quantity: String(p.quantity || "").trim(),
    owner: "Christopher Banks",
    stage: "New Lead",
    source: "Quote Form",
    clientType: residential ? "Residential" : "Commercial",
    notes: websiteLeadNote(p),
    requestId: String(p.requestId || p.id || "").trim()
  };
}
