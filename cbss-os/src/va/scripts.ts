/** Spoken Harbor lines. Vary them — do not read the same sentence every call. */

export const CHRISTOPHER_PERSONAL_CELL = "(870) 323-2593";
export const CHRISTOPHER_PERSONAL_DIGITS = "8703232593";

export const PAYMENT_PATH_LINE =
  "Cards frozen — wire / ACH / e-check / money order / cashier's check / cash only. Harbor does not collect payment.";

export type SpokenLine = { id: string; spoken: string };

/** Accounting handoff. Light, self-deprecating, a little cheesy — never stiff corporate. */
export const READY_TO_BUY_VARIANTS: SpokenLine[] = [
  {
    id: "accounting",
    spoken:
      "That's great — I love what you want to do here. Unfortunately I can't take your payment; I have to push you off to someone in accounting — they handle all that for me, I'm just in sales.",
  },
  {
    id: "cash-drawer",
    spoken:
      "Man, I love this project. Only problem is they won't let me take your money — I have to bump you to accounting. They handle all that for me. I'm just in sales.",
  },
  {
    id: "checkbook",
    spoken:
      "That's the good stuff. I'd close it myself but I don't get the cash drawer — accounting collects, I just talk containers.",
  },
  {
    id: "boxes",
    spoken:
      "Perfect. I'm gonna walk you over to the folks who actually take payment. They handle the money; I'm just the guy who gets excited about boxes.",
  },
];

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
