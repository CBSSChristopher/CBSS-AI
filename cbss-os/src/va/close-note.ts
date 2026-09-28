export type HarborDealFields = {
  quoted?: unknown;
  size?: unknown;
  type?: unknown;
  condition?: unknown;
  delivery?: unknown;
  timing?: unknown;
  use?: unknown;
  objections?: unknown;
  promises?: unknown;
  price?: unknown;
};

export const HARBOR_READY_TO_BUY_PAYMENT_LINE =
  "Payment: wire, ACH, e-check, money order, cashier's check or cash only.";

function clip(value: unknown, max = 240): string {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function blank(value: unknown): string {
  const text = clip(value);
  if (!text) return "";
  if (/not stated|do not invent|no posted match|box not matched|cards frozen/i.test(text)) return "";
  return text;
}

export function readHarborDeal(body: Record<string, unknown> | null | undefined): HarborDealFields {
  const src = body && typeof body === "object" ? body : {};
  const nested = src.deal && typeof src.deal === "object" ? (src.deal as Record<string, unknown>) : {};
  return {
    quoted: src.quoted ?? nested.quoted,
    size: src.size ?? nested.size,
    type: src.type ?? nested.type,
    condition: src.condition ?? nested.condition,
    delivery: src.delivery ?? src.pickup ?? nested.delivery ?? nested.pickup,
    timing: src.timing ?? src.deliveryTiming ?? src.delivery_timing ?? nested.timing,
    use: src.use ?? src.purpose ?? nested.use ?? nested.purpose,
    objections: src.objections ?? nested.objections,
    promises: src.promises ?? src.softPromises ?? nested.promises ?? nested.softPromises,
    price: src.price ?? src.exactPrice ?? nested.price ?? nested.exactPrice,
  };
}

export function sizeTypeCondition(deal: HarborDealFields): string {
  return plainBox(deal.size, deal.type, deal.condition);
}

function plainPhone(value: unknown): string {
  const text = blank(value);
  if (!text) return "";
  const digits = text.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length === 10) return "(" + ten.slice(0, 3) + ") " + ten.slice(3, 6) + "-" + ten.slice(6);
  return text;
}

function plainPrice(value: unknown): string {
  const text = blank(value);
  if (!text) return "";
  const numeric = text.replace(/[$,\s]/g, "");
  if (/^\d+(\.\d+)?$/.test(numeric)) {
    const amount = Math.round(Number(numeric));
    if (amount > 0) return "$" + amount.toLocaleString("en-US");
    return "";
  }
  return text;
}

function plainCondition(value: unknown): string {
  const text = blank(value);
  if (!text) return "";
  if (/\bWWT\b|wind and water/i.test(text)) return "wind and water tight";
  if (/\bCW\b|cargo worthy/i.test(text)) return "cargo worthy";
  if (/one[\s-]?trip|\bonetrip\b/i.test(text)) return "one-trip";
  if (/\bIICL\b|multi-trip/i.test(text)) return "IICL / multi-trip";
  if (/as[\s-]?is/i.test(text)) return "as-is";
  if (/^(HC|DC|standard|CW|WWT)$/i.test(text)) return "";
  return text;
}

/** Size, height, and condition in words. Known codes are expanded. Unstated parts are left out. */
export function plainBox(size: unknown, type: unknown, condition: unknown): string {
  const sizeText = blank(size);
  const typeText = blank(type);
  const splitCodes = (value: string) => value.replace(/(\d)\s*(HC|DC)\b/gi, "$1 $2");
  const raw = splitCodes([sizeText, typeText].filter(Boolean).join(" "));
  const feet = raw.match(/\b(\d{2})(?!\d)/);
  const high = /\bHC\b|high\s*cube/i.test(raw);
  const standardHeight = !high && /\bDC\b|\bstandard\b/i.test(raw);
  const config = splitCodes(typeText).replace(/\b(HC|DC|standard)\b/gi, "").replace(/\b\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  const phrase = [];
  if (feet) phrase.push(feet[1] + "ft");
  else if (sizeText && !/\b(HC|DC)\b/i.test(splitCodes(sizeText))) phrase.push(sizeText);
  if (high) phrase.push("high cube");
  else if (standardHeight) phrase.push("standard");
  const bits = [];
  if (phrase.length) bits.push(phrase.join(" "));
  if (config) bits.push(config);
  const cond = plainCondition(condition);
  if (cond) bits.push(cond);
  return bits.filter(Boolean).join(", ");
}

function plainWhen(delivery: unknown, timing: unknown): string {
  const method = blank(delivery);
  const when = blank(timing);
  if (!method && !when) return "";
  if (/^deliver(y)?$/i.test(method)) return when ? "delivery " + when : "delivery";
  if (/^pickup$/i.test(method)) return when ? "pickup " + when : "pickup";
  if (method && when && !method.toLowerCase().includes(when.toLowerCase())) return method + ", " + when;
  return method || when;
}

function cityZip(city: unknown, zip: unknown, place: unknown): string {
  const z = String(zip || "").replace(/\D/g, "").slice(0, 5);
  let town = blank(city);
  if (!town) town = blank(place).split(",")[0].trim();
  return [town, z].filter(Boolean).join(" ");
}

function notesLine(objections: unknown, promises: unknown): string {
  const bits = [blank(objections), blank(promises)].filter(Boolean);
  if (!bits.length) return "";
  return "Notes: " + bits.join(". ");
}

export type ReadyToBuyNotice = { subject: string; text: string };

export type ReadyToBuyNoticeInput = {
  name?: unknown;
  phone?: unknown;
  city?: unknown;
  zip?: unknown;
  place?: unknown;
  size?: unknown;
  type?: unknown;
  condition?: unknown;
  use?: unknown;
  delivery?: unknown;
  timing?: unknown;
  price?: unknown;
  objections?: unknown;
  promises?: unknown;
  test?: boolean;
};

/** One plain-English ready-to-buy note. The email body and the CRM note are this text. */
export function renderHarborReadyToBuyNotice(input: ReadyToBuyNoticeInput): ReadyToBuyNotice {
  const name = blank(input.name);
  const box = plainBox(input.size, input.type, input.condition);
  const need = box || blank(input.use);
  let subject = name && need ? "Ready to buy: " + name + " - " + need : name ? "Ready to buy: " + name : need ? "Ready to buy: " + need : "Ready to buy";
  if (input.test) subject = "[TEST - not a customer] " + subject;
  const headBits = [name, plainPhone(input.phone), cityZip(input.city, input.zip, input.place)].filter(Boolean);
  const want = [box, blank(input.use), plainWhen(input.delivery, input.timing), plainPrice(input.price)].filter(Boolean).join(", ");
  const price = plainPrice(input.price);
  const lines = [
    headBits.length ? "Ready to buy: " + headBits.join(", ") : "Ready to buy",
    want,
    "Harbor told them: back office will send next steps.",
    HARBOR_READY_TO_BUY_PAYMENT_LINE,
    "Your move: " + (price ? "send invoice" : "call back"),
    notesLine(input.objections, input.promises),
  ].filter(Boolean);
  if (input.test) lines.unshift("[TEST - not a customer]");
  return { subject, text: lines.join("\n") };
}

export function readyToBuyNoticeFromContact(
  contact: Record<string, unknown> | null | undefined,
  deal: HarborDealFields = {},
  extra: { place?: unknown; zip?: unknown; test?: boolean } = {},
): ReadyToBuyNotice {
  const row = contact || {};
  return renderHarborReadyToBuyNotice({
    name: row.name,
    phone: row.phone || row.mobile,
    city: row.city,
    zip: extra.zip || row.zip,
    place: extra.place || row.place,
    size: deal.size,
    type: deal.type,
    condition: deal.condition,
    use: deal.use || row.use || row.purpose,
    delivery: deal.delivery,
    timing: deal.timing || row.timing,
    price: deal.price,
    objections: deal.objections,
    promises: deal.promises,
    test: extra.test,
  });
}

export function buildReadyToBuyNote(input: {
  contact?: Record<string, unknown> | null;
  deal?: HarborDealFields;
  test?: boolean;
}): string {
  return readyToBuyNoticeFromContact(input.contact, input.deal, { test: input.test }).text;
}

export type NeedsHumanNoticeInput = {
  name?: unknown;
  phone?: unknown;
  city?: unknown;
  zip?: unknown;
  place?: unknown;
  asked?: unknown;
  callbackPhone?: unknown;
  callbackTime?: unknown;
  objections?: unknown;
  promises?: unknown;
  test?: boolean;
};

/** Short note when Harbor cannot answer and a person has to call back. Email and CRM note are this text. */
export function renderHarborNeedsHumanNotice(input: NeedsHumanNoticeInput): ReadyToBuyNotice {
  const name = blank(input.name);
  const asked = blank(input.asked);
  let subject = name ? "Needs a human: " + name : "Needs a human";
  if (input.test) subject = "[TEST - not a customer] " + subject;
  const headBits = [name, plainPhone(input.phone), cityZip(input.city, input.zip, input.place)].filter(Boolean);
  const callbackPhone = plainPhone(input.callbackPhone) || blank(input.callbackPhone);
  const callbackTime = blank(input.callbackTime);
  const callbackBits = [callbackPhone, callbackTime].filter(Boolean);
  const lines = [
    headBits.length ? "Needs a human: " + headBits.join(", ") : "Needs a human",
    asked,
    callbackBits.length ? "Callback: " + callbackBits.join(", ") : "",
    "Harbor told them: someone from the team will call back.",
    "Your move: call back",
    notesLine(input.objections, input.promises),
  ].filter(Boolean);
  if (input.test) lines.unshift("[TEST - not a customer]");
  return { subject, text: lines.join("\n") };
}
