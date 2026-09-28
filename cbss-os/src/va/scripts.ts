/** Spoken Harbor lines. Vary them — do not read the same sentence every call. */

export const CHRISTOPHER_PERSONAL_CELL = "(870) 323-2593";
export const CHRISTOPHER_PERSONAL_DIGITS = "8703232593";

export const PAYMENT_PATH_LINE =
  "Cards frozen — wire / ACH / e-check / money order / cashier's check / cash only. Harbor does not collect payment.";

export type SpokenLine = { id: string; spoken: string };

/**
 * Ready-to-buy speech. Back office / accounting will reach out with next steps.
 * Not a live transfer. No clock time. Vary them — do not read the same one every call.
 */
export const READY_TO_BUY_VARIANTS: SpokenLine[] = [
  {
    id: "accounting",
    spoken:
      "No worries — to get the ball rolling on your order, I'll have my people in back office who handle accounting send you next steps so we can get that container out to you.",
  },
  {
    id: "cash-drawer",
    spoken:
      "Alright, I'll have accounting in the back office shoot you the next steps so we can get that container on the road.",
  },
  {
    id: "checkbook",
    spoken:
      "Perfect. I'll have my people in the back office reach out with next steps — they handle the paperwork, and then we can get that box out to you.",
  },
  {
    id: "boxes",
    spoken:
      "Sounds good. Back office will be in touch with the next steps so we can get this moving. They take care of the accounting side.",
  },
];

/** Outbound open when the lead record shows they asked for a quote. */
export const HARBOR_QUOTE_REQUEST_OPENER =
  "Hey, this is Harbor from over here at CB Shipping Solutions — I was reaching out about that shipping container quote you asked us for.";

/** Outbound open when they looked into containers / storage and did not ask for a quote. */
export const HARBOR_LOOKED_IN_OPENERS = [
  "Hey, this is Harbor from over here at CB Shipping Solutions — you were looking into containers for storage, so I figured I'd give you a call.",
  "Hey, this is Harbor with CB Shipping Solutions — saw you'd been looking at storage containers. What are you thinking?",
] as const;

export type HarborOpenerKind = "quote_request" | "looked_in";

const QUOTE_REQUEST_RE =
  /\b(quote request|requested a quote|asked (?:us |me )?for a quote|request(?:ed|ing)? (?:a |us for a )?quote|get a quote|need a quote)\b/i;

function flagOn(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") return /^(true|1|yes)$/i.test(value.trim());
  return false;
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => textOf(item)).join("\n");
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return [row.text, row.body, row.note, row.summary, row.form, row.campaign].map((item) => textOf(item)).join("\n");
  }
  return "";
}

/** True only when the lead record itself shows a quote request. A bare "container" interest is not one. */
export function leadShowsQuoteRequest(contact: Record<string, unknown> | null | undefined): boolean {
  if (!contact) return false;
  if (
    flagOn(contact.quoteRequested) ||
    flagOn(contact.quote_requested) ||
    flagOn(contact.requestedQuote) ||
    flagOn(contact.requested_quote)
  ) {
    return true;
  }
  const stage = String(contact.status || contact.stage || "").trim().toLowerCase();
  if (stage === "quoted" || stage === "proposal sent") return true;
  const form = textOf(contact.form || contact.formName);
  if (/\bquote\b/i.test(form)) return true;
  const blob = [
    contact.notes,
    contact.note,
    contact.source,
    contact.campaign,
    contact.ad,
    contact.adName,
    contact.reason,
    contact.interest,
    contact.leadType,
    contact.summary,
    contact.nextAction,
    contact.container,
  ]
    .map((item) => textOf(item))
    .join("\n");
  return QUOTE_REQUEST_RE.test(blob);
}

export function harborOutboundOpener(
  contact: Record<string, unknown> | null | undefined,
  now = Date.now(),
): { kind: HarborOpenerKind; spoken: string } {
  if (leadShowsQuoteRequest(contact)) {
    return { kind: "quote_request", spoken: HARBOR_QUOTE_REQUEST_OPENER };
  }
  const spoken = HARBOR_LOOKED_IN_OPENERS[Math.floor(now / 60000) % HARBOR_LOOKED_IN_OPENERS.length];
  return { kind: "looked_in", spoken };
}

const VARIANT_BY_ID = new Map(READY_TO_BUY_VARIANTS.map((row) => [row.id, row]));

export function pickReadyToBuyLine(seed?: unknown, now = Date.now()): SpokenLine {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    const i = Math.abs(Math.floor(seed)) % READY_TO_BUY_VARIANTS.length;
    return READY_TO_BUY_VARIANTS[i];
  }
  const key = String(seed || "").trim().toLowerCase();
  if (key && VARIANT_BY_ID.has(key)) return VARIANT_BY_ID.get(key) as SpokenLine;
  const named = READY_TO_BUY_VARIANTS.find((row) => row.spoken.toLowerCase() === key);
  if (named) return named;
  return READY_TO_BUY_VARIANTS[Math.floor(now / 60000) % READY_TO_BUY_VARIANTS.length];
}

export function firstSpokenName(raw: unknown): string {
  const first = String(raw || "")
    .trim()
    .split(/\s+/)[0];
  return first || "there";
}

export function isChristopherPersonalCell(value: unknown): boolean {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits === CHRISTOPHER_PERSONAL_DIGITS) return true;
  const text = String(value || "");
  return text.includes(CHRISTOPHER_PERSONAL_CELL) || text.includes("870-323-2593");
}

/** Harbor Twilio DID only. Never Christopher's personal cell on customer CTE / voicemail. */
export function harborCallbackNumber(did: unknown): string {
  const raw = String(did || "").trim();
  if (!raw || isChristopherPersonalCell(raw)) return "the Harbor callback number on this line";
  return raw;
}

export function voicemailScript(opts: {
  name?: unknown;
  company?: unknown;
  container?: unknown;
  harborDid?: unknown;
}): string {
  const who = firstSpokenName(opts.name);
  const box = String(opts.container || "").trim() || "shipping container";
  const company = String(opts.company || "").trim();
  const forWho = company ? " for " + company : "";
  const did = harborCallbackNumber(opts.harborDid);
  return (
    "Hey " +
    who +
    ", this is Harbor with CB Shipping Solutions. I was calling about that " +
    box +
    forWho +
    " — I'd love to help you get it moving. Give me a ring back at " +
    did +
    " when you've got a minute. Talk soon."
  );
}

export function softDelaySpoken(when = "the next business day"): string {
  return (
    "No rush at all — I'll park a note and catch you " +
    when +
    ". You're still on my list; I'm not closing you out."
  );
}

export function hardNoSpoken(): string {
  return "Understood. I won't keep calling. Thanks for the time.";
}
