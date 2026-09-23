import { loginCrmTool, loginProposalTool, origins, UA, type Env } from "../auth.ts";
import { sendAgentMail, type SendMailResult } from "../cycle/agentmail.ts";
import { rosterCompanyEmail } from "../cycle/rep.ts";
import { pushAlert } from "../cycle/store.ts";
import { normalizeGrade, normalizeHeight } from "../proposal-lines.ts";
import {
  lookupZipFromZippopotam,
  matchPostedBox,
  type BoxPick,
  type PostedMatch,
  type RawOffer,
  type ZipGeo,
} from "../xchange-match.ts";
import { crmContactPool, crmRequestWithCookie } from "./crm-client.ts";
import { timingSafeEqualStr } from "./hmac.ts";
import { matchCrmContact } from "./match.ts";
import { pickReadyToBuyLine } from "./scripts.ts";
import {
  HUMAN_CLOSERS,
  harborOutcomeEdits,
  harborOutcomePlan,
  resolveCloser,
  type HumanCloser,
} from "./workflow.ts";

export const HARBOR_QUOTE_PATH = "/va/harbor/quote";
export const HARBOR_READY_TO_BUY_PATH = "/va/harbor/ready-to-buy";
export const DEFAULT_HARBOR_MARGIN = 700;
export const HARBOR_CLOSERS = HUMAN_CLOSERS;
export const HARBOR_NOTIFY_EMAILS = [
  rosterCompanyEmail("Christopher Banks"),
  rosterCompanyEmail("Bryan Reese"),
] as const;

export type HarborQuoteHandlerResult = { status: number; body: Record<string, unknown> };

export type HarborQuoteWant = BoxPick & { qty: number; fulfillment: string };

export type HarborQuoteBox = {
  size: string;
  height: string;
  config: string;
  grade: string;
  qty: number;
  fulfillment: string;
  wholesale: number;
  delivery: number;
  depot: string;
  city: string;
  miles: number | null;
};

export type HarborQuoteOk = {
  ok: true;
  spoken_summary: string;
  unit_price: number;
  box: HarborQuoteBox;
  place: string;
  zip: string;
  dialing: false;
  sms: false;
};

export type HarborQuoteMiss = {
  ok: false;
  reason: "no_match" | "inventory_unavailable" | "zip_not_found";
  spoken_summary: string;
  unit_price: null;
  box: null;
  place: string;
  zip: string;
  dialing: false;
  sms: false;
  error?: string;
};

export type HarborQuoteResult = HarborQuoteOk | HarborQuoteMiss;

export type HarborQuoteDeps = {
  lookupZip?: (zip: string) => Promise<ZipGeo | null>;
  loadOffers?: (opts: { refresh: boolean }) => Promise<{ offers: RawOffer[]; pulledAt?: string; error?: string }>;
  sendMail?: (
    env: { AGENTMAIL_API_KEY?: string; AGENTMAIL_INBOX?: string },
    input: { to: string[]; subject: string; text: string; labels?: string[] },
    fetchImpl?: typeof fetch,
  ) => Promise<SendMailResult>;
  getContacts?: () => Promise<unknown[]>;
  writeNote?: (contactId: string, text: string, edits: Record<string, unknown>) => Promise<boolean>;
  now?: number;
};

function str(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function heightLabel(height: string): string {
  if (height === "HC") return "high cube";
  if (height === "DC") return "standard";
  return height || "high cube";
}

function rails(): { dialing: false; sms: false } {
  return { dialing: false, sms: false };
}

/** Same cash ticket as The Yard proposal UI. Never run without a posted wholesale. */
export function harborCashQuote(wholesale: number, delivery = 0, margin = DEFAULT_HARBOR_MARGIN): number {
  if (!(wholesale > 0)) return 0;
  const haul = Math.max(0, Number(delivery) || 0);
  const pad = Math.max(300, Number(margin) || DEFAULT_HARBOR_MARGIN);
  return Math.ceil((wholesale + haul + pad) / 25) * 25;
}

export function normalizeHarborZip(raw: unknown): string {
  return String(raw || "").replace(/\D/g, "").slice(0, 5);
}

export function harborQuoteWant(body: Record<string, unknown> | null | undefined): HarborQuoteWant {
  const src = body && typeof body === "object" ? body : {};
  const nested = src.quote && typeof src.quote === "object" ? (src.quote as Record<string, unknown>) : {};
  const size = str(src.size ?? nested.size) || "40";
  const height = normalizeHeight(str(src.height ?? nested.height) || "HC");
  const config = str(src.config ?? nested.config) || "standard";
  const grade = normalizeGrade(str(src.grade ?? nested.grade ?? src.condition ?? nested.condition) || "CW");
  const qty = Math.max(1, Number(src.qty ?? nested.qty ?? src.quantity ?? 1) || 1);
  const fulfillment = str(src.fulfillment ?? nested.fulfillment) === "pickup" ? "pickup" : "deliver";
  return { size, height, config, grade, qty, fulfillment };
}

export function harborServiceToken(request: Request): string {
  const header = str(request.headers.get("x-harbor-token"));
  if (header) return header;
  return str(request.headers.get("authorization")).replace(/^bearer\s+/i, "");
}

export function harborQuoteTokenExpected(env: { HARBOR_QUOTE_TOKEN?: string }): string {
  return str(env.HARBOR_QUOTE_TOKEN);
}

export function harborQuoteAuthed(request: Request, env: { HARBOR_QUOTE_TOKEN?: string }): boolean {
  const expected = harborQuoteTokenExpected(env);
  if (!expected) return false;
  const given = harborServiceToken(request);
  return Boolean(given) && timingSafeEqualStr(given, expected);
}

/** Sales-rep tools: HARBOR_QUOTE_TOKEN (header or Bearer) or Bearer VA_WEBHOOK_SECRET. */
export function harborWorkflowAuthed(
  request: Request,
  env: { HARBOR_QUOTE_TOKEN?: string; VA_WEBHOOK_SECRET?: string },
): boolean {
  if (harborQuoteAuthed(request, env)) return true;
  const secret = str(env.VA_WEBHOOK_SECRET);
  if (!secret) return false;
  const bearer = str(request.headers.get("authorization")).replace(/^bearer\s+/i, "");
  return Boolean(bearer) && timingSafeEqualStr(bearer, secret);
}

export function harborQuoteAuthResult(request: Request, env: { HARBOR_QUOTE_TOKEN?: string }): HarborQuoteHandlerResult | null {
  if (harborQuoteAuthed(request, env)) return null;
  if (!harborQuoteTokenExpected(env)) {
    return {
      status: 401,
      body: {
        ok: false,
        error: "HARBOR_QUOTE_TOKEN is not set. Harbor quote is parked.",
        ...rails(),
      },
    };
  }
  return { status: 401, body: { ok: false, error: "Need a Harbor quote token.", ...rails() } };
}

export function spokenHarborQuote(hit: PostedMatch, zip: string, place: string, want: HarborQuoteWant, unitPrice: number): string {
  const where = place || ("ZIP " + zip);
  const haul = want.fulfillment === "pickup" ? "pickup" : "delivered";
  const article = want.qty > 1 ? want.qty + " " : "a ";
  const cfg = want.config === "standard" ? "" : want.config + " ";
  return (
    "For " +
    article +
    want.size +
    " " +
    heightLabel(want.height) +
    " " +
    cfg +
    want.grade +
    " " +
    haul +
    " to " +
    where +
    ", the posted price is " +
    money(unitPrice) +
    "."
  );
}

export function spokenHarborNoMatch(zip: string, place: string, reason: HarborQuoteMiss["reason"]): string {
  if (reason === "inventory_unavailable") {
    return "I cannot pull the posted book right now. I'll note what they need and Christopher or Bryan can quote.";
  }
  if (reason === "zip_not_found") {
    return "I could not place that ZIP. I need a real 5-digit US ZIP before I quote.";
  }
  const where = place ? " (" + place + ")" : "";
  return "I don't have a posted number for ZIP " + zip + where + " and that box.";
}

export function harborQuoteFromMatch(
  hit: PostedMatch,
  geo: ZipGeo | null,
  zip: string,
  want: HarborQuoteWant,
): HarborQuoteResult {
  const place = geo?.place || "";
  if (!hit.ok || !(Number(hit.wholesale) > 0)) {
    return {
      ok: false,
      reason: "no_match",
      spoken_summary: spokenHarborNoMatch(zip, place, "no_match"),
      unit_price: null,
      box: null,
      place,
      zip,
      ...rails(),
    };
  }
  const wholesale = Number(hit.wholesale);
  const delivery = want.fulfillment === "pickup" ? 0 : Math.max(0, Number(hit.delivery) || 0);
  const unitPrice = harborCashQuote(wholesale, delivery);
  if (!(unitPrice > 0)) {
    return {
      ok: false,
      reason: "no_match",
      spoken_summary: spokenHarborNoMatch(zip, place, "no_match"),
      unit_price: null,
      box: null,
      place,
      zip,
      ...rails(),
    };
  }
  return {
    ok: true,
    spoken_summary: spokenHarborQuote(hit, zip, place, want, unitPrice),
    unit_price: unitPrice,
    box: {
      size: want.size,
      height: want.height,
      config: want.config,
      grade: want.grade,
      qty: want.qty,
      fulfillment: want.fulfillment,
      wholesale,
      delivery,
      depot: str(hit.depot || hit.city),
      city: str(hit.city),
      miles: hit.miles == null ? null : Number(hit.miles),
    },
    place,
    zip,
    ...rails(),
  };
}

export async function lookupHarborZip(zip: string, lookup?: HarborQuoteDeps["lookupZip"]): Promise<ZipGeo | null> {
  if (lookup) return lookup(zip);
  const res = await fetch("https://api.zippopotam.us/us/" + zip, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  return lookupZipFromZippopotam((await res.json()) as { places?: Array<Record<string, string>> });
}

export async function loadHarborOffers(
  env: Env,
  refresh: boolean,
  load?: HarborQuoteDeps["loadOffers"],
): Promise<{ offers: RawOffer[]; pulledAt?: string; error?: string }> {
  if (load) return load({ refresh });
  const email = str(env.VA_CRM_EMAIL);
  const password = str(env.VA_CRM_PASSWORD);
  if (!email || !password) {
    return { offers: [], error: "Set VA_CRM_EMAIL / VA_CRM_PASSWORD so Harbor can pull posted proposal inventory." };
  }
  const login = await loginProposalTool(env, email, password);
  if (!login.ok) return { offers: [], error: login.error || "Proposal service login failed." };
  const origin = origins(env).proposal;
  const path = refresh ? "/inventory/refresh" : "/inventory";
  const req = new Request(origin + path, {
    method: refresh ? "POST" : "GET",
    headers: {
      Cookie: login.cookie,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: origin,
    },
    body: refresh ? "{}" : undefined,
  });
  const res = env.PROPOSAL ? await env.PROPOSAL.fetch(req) : await fetch(req);
  const inv = (await res.json().catch(() => ({}))) as { offers?: unknown[]; items?: unknown[]; error?: string; pulledAt?: string };
  const offers = Array.isArray(inv.offers) ? inv.offers : Array.isArray(inv.items) ? inv.items : [];
  return {
    offers: offers as RawOffer[],
    pulledAt: inv.pulledAt || "",
    error: res.ok ? "" : str(inv.error) || "Could not read posted inventory.",
  };
}

export async function runHarborQuote(
  env: Env,
  body: Record<string, unknown>,
  deps: HarborQuoteDeps = {},
): Promise<{ status: number; result: HarborQuoteResult }> {
  const zip = normalizeHarborZip(body.zip ?? (body.quote && typeof body.quote === "object" ? (body.quote as Record<string, unknown>).zip : ""));
  if (zip.length !== 5) {
    return {
      status: 400,
      result: {
        ok: false,
        reason: "zip_not_found",
        spoken_summary: "I need a real 5-digit US ZIP before I quote.",
        unit_price: null,
        box: null,
        place: "",
        zip,
        ...rails(),
        error: "Type a 5-digit ZIP.",
      },
    };
  }
  const want = harborQuoteWant(body);
  const geo = await lookupHarborZip(zip, deps.lookupZip);
  if (!geo) {
    return {
      status: 400,
      result: {
        ok: false,
        reason: "zip_not_found",
        spoken_summary: spokenHarborNoMatch(zip, "", "zip_not_found"),
        unit_price: null,
        box: null,
        place: "",
        zip,
        ...rails(),
        error: "Could not find that ZIP.",
      },
    };
  }
  const inv = await loadHarborOffers(env, body.refresh === true, deps.loadOffers);
  if (inv.error && !inv.offers.length) {
    return {
      status: 503,
      result: {
        ok: false,
        reason: "inventory_unavailable",
        spoken_summary: spokenHarborNoMatch(zip, geo.place, "inventory_unavailable"),
        unit_price: null,
        box: null,
        place: geo.place,
        zip,
        ...rails(),
        error: inv.error,
      },
    };
  }
  const hit = matchPostedBox(inv.offers, want, geo, want.qty, want.fulfillment);
  const result = harborQuoteFromMatch(hit, geo, zip, want);
  return { status: 200, result };
}

export async function handleHarborQuote(env: Env, request: Request, deps: HarborQuoteDeps = {}): Promise<HarborQuoteHandlerResult> {
  const denied = harborQuoteAuthResult(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const ran = await runHarborQuote(env, body && typeof body === "object" ? body : {}, deps);
  return { status: ran.status, body: ran.result };
}

export function harborReadyToBuyNotifyText(input: {
  closer: HumanCloser;
  variantId: string;
  spoken: string;
  contactName: string;
  phone: string;
  quote: HarborQuoteResult | HarborQuoteMiss;
  note: string;
}): string {
  const price = input.quote.ok ? money(input.quote.unit_price) : "not stated — no posted match; do not invent";
  const place = input.quote.place || input.quote.zip || "ZIP not stated";
  const box = input.quote.ok
    ? input.quote.box.size + " " + heightLabel(input.quote.box.height) + " " + input.quote.box.grade
    : "box not matched";
  return [
    "Harbor ready-to-buy handoff.",
    "Closer of record: " + input.closer + ". Notify Christopher Banks + Bryan Reese.",
    "Contact: " + (input.contactName || "not stated") + " · " + (input.phone || "no phone"),
    "ZIP / place: " + place,
    "Box: " + box,
    "Quoted: " + price,
    "Spoken (" + input.variantId + "): " + input.spoken,
    "Cards frozen. Harbor does not collect payment. No SMS.",
    "",
    input.note,
    "",
    "CB Shipping Solutions",
  ].join("\n");
}

export function planHarborReadyToBuyNotify(closer: HumanCloser): { to: string[]; closer: HumanCloser } {
  const to = [...HARBOR_NOTIFY_EMAILS].filter(Boolean);
  return { to, closer };
}

async function harborServiceContacts(env: Env, deps: HarborQuoteDeps): Promise<unknown[]> {
  if (deps.getContacts) return deps.getContacts();
  const email = str(env.VA_CRM_EMAIL);
  const password = str(env.VA_CRM_PASSWORD);
  if (!email || !password) return [];
  const login = await loginCrmTool(env, email, password);
  if (!login.ok) return [];
  const book = await crmRequestWithCookie(env, login.cookie, { method: "GET", search: "?action=get&omitNotes=1" });
  return crmContactPool(book.data);
}

async function harborServiceWrite(
  env: Env,
  contactId: string,
  text: string,
  edits: Record<string, unknown>,
  deps: HarborQuoteDeps,
): Promise<boolean> {
  if (deps.writeNote) return deps.writeNote(contactId, text, edits);
  const email = str(env.VA_CRM_EMAIL);
  const password = str(env.VA_CRM_PASSWORD);
  if (!email || !password) return false;
  const login = await loginCrmTool(env, email, password);
  if (!login.ok) return false;
  const saved = await crmRequestWithCookie(env, login.cookie, {
    body: { action: "saveContactEdits", contactEdits: { [contactId]: edits } },
  });
  const note = await crmRequestWithCookie(env, login.cookie, {
    body: { action: "appendNote", contactId, text, tag: "Book" },
  });
  return saved.ok && note.ok;
}

export async function handleHarborReadyToBuy(env: Env, request: Request, deps: HarborQuoteDeps = {}): Promise<HarborQuoteHandlerResult> {
  const denied = harborQuoteAuthResult(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const src = body && typeof body === "object" ? body : {};
  const contact = src.contact && typeof src.contact === "object" ? (src.contact as Record<string, unknown>) : {};
  const quoteBody = src.quote && typeof src.quote === "object" ? (src.quote as Record<string, unknown>) : src;
  const closer = resolveCloser(src.closer);
  const variant = pickReadyToBuyLine(src.handoff_variant ?? src.spoken ?? src.variant, deps.now);
  const zip = normalizeHarborZip(quoteBody.zip ?? src.zip);
  let quote: HarborQuoteResult;
  if (zip.length === 5) {
    const ran = await runHarborQuote(env, { ...src, ...quoteBody, zip }, deps);
    if (ran.status === 400 && ran.result.reason === "zip_not_found" && !normalizeHarborZip(quoteBody.zip ?? src.zip)) {
      quote = ran.result;
    } else {
      quote = ran.result;
    }
  } else if (zip.length > 0 && zip.length !== 5) {
    return {
      status: 400,
      body: { ok: false, error: "Type a 5-digit ZIP.", reason: "bad_zip", ...rails() },
    };
  } else {
    quote = {
      ok: false,
      reason: "no_match",
      spoken_summary: spokenHarborNoMatch("", "", "no_match"),
      unit_price: null,
      box: null,
      place: "",
      zip: "",
      ...rails(),
    };
  }
  const contactName = str(src.contact_name ?? contact.name ?? src.name);
  const phone = str(src.phone ?? contact.phone ?? src.contact_phone);
  const email = str(src.email ?? contact.email);
  const contactId = str(src.contactId ?? src.contact_id ?? contact.id ?? contact.contactId);
  const rows = await harborServiceContacts(env, deps);
  const hit = matchCrmContact(rows, { contactId, phone, email });
  const deal = {
    quoted: quote.ok ? quote.spoken_summary : "no posted match — do not invent",
    size: quote.ok ? quote.box.size : str(quoteBody.size),
    type: quote.ok ? quote.box.height + " " + quote.box.config : str(quoteBody.height || quoteBody.config),
    condition: quote.ok ? quote.box.grade : str(quoteBody.grade),
    delivery: quote.ok ? quote.box.fulfillment : str(quoteBody.fulfillment),
    price: quote.ok ? String(quote.unit_price) : "",
    objections: src.objections,
    promises: src.promises,
  };
  const plan = harborOutcomePlan(hit || { name: contactName, phone, owner: "Harbor", status: "Working", cteStage: "CTE1" }, "ready-to-buy", {
    closer,
    spoken: variant.id,
    deal,
    note: str(src.note),
  });
  let noteWritten = false;
  if (hit && hit.id) {
    noteWritten = await harborServiceWrite(env, String(hit.id), plan.note, harborOutcomeEdits(plan), deps);
  }
  const notify = planHarborReadyToBuyNotify(closer);
  const text = harborReadyToBuyNotifyText({
    closer,
    variantId: variant.id,
    spoken: variant.spoken,
    contactName: contactName || str(hit?.name),
    phone: phone || str(hit?.phone),
    quote,
    note: plan.note,
  });
  const send = deps.sendMail || sendAgentMail;
  const mailed = await send(env, {
    to: notify.to,
    subject: "Harbor ready-to-buy — " + (contactName || str(hit?.name) || "lead") + " — " + closer,
    text,
    labels: ["harbor-ready-to-buy"],
  });
  for (const addr of notify.to) {
    await pushAlert(env, addr, hit ? String(hit.id) : "", "Harbor ready-to-buy · " + closer + " · " + (contactName || "lead"));
  }
  return {
    status: 200,
    body: {
      ok: true,
      ...rails(),
      closer,
      handoff_variant: variant.id,
      spoken: variant.spoken,
      spoken_summary: quote.ok ? quote.spoken_summary : quote.spoken_summary,
      unit_price: quote.ok ? quote.unit_price : null,
      quote,
      noteWritten,
      notified: notify.to,
      mail: mailed.ok ? { ok: true, messageId: mailed.messageId } : { ok: false, error: mailed.error },
      sms: false,
      dialing: false,
      contact: hit ? { id: String(hit.id || ""), name: str(hit.name), phone: str(hit.phone) } : null,
    },
  };
}

export { HARBOR_CLOSERS as READY_TO_BUY_CLOSERS };
