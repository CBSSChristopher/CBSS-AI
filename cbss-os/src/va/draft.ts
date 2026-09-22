import { DEFAULT_CLOSER } from "./note.ts";

export const VA_DRAFT_KINDS = ["intro", "callback", "booked-confirm"] as const;
export type VaDraftKind = (typeof VA_DRAFT_KINDS)[number];

export function normalizeDraftKind(raw: unknown): VaDraftKind {
  const key = String(raw || "").trim().toLowerCase();
  if (key === "callback" || key === "booked-confirm") return key;
  return "intro";
}

/** Drafts only. Never send from this function. */
export function buildVaEmailDraft(input: {
  kind?: unknown;
  to?: unknown;
  name?: unknown;
  company?: unknown;
  bookedAt?: unknown;
  closer?: unknown;
}): { to: string; subject: string; text: string; sent: false; kind: VaDraftKind } {
  const kind = normalizeDraftKind(input.kind);
  const to = String(input.to || "").trim();
  const name = String(input.name || "").trim() || "there";
  const company = String(input.company || "").trim();
  const bookedAt = String(input.bookedAt || "").trim();
  const closer = String(input.closer || "").trim() || DEFAULT_CLOSER;
  const who = company ? `${name} at ${company}` : name;

  if (kind === "callback") {
    return {
      kind,
      to,
      sent: false,
      subject: "CB Shipping Solutions — callback",
      text: [
        `Hi ${name},`,
        "",
        `This is a draft from the CB Shipping Solutions outbound desk for ${who}.`,
        "We will call back at the window you gave us. This note is not a price, not a card link, and not a text.",
        "Cards are frozen. If we get to payment later, that is wire, ACH, e-check, money order, cashier's check, or cash only.",
        "",
        `Closer of record: ${closer}.`,
        "",
        "CB Shipping Solutions outbound desk",
      ].join("\n"),
    };
  }

  if (kind === "booked-confirm") {
    return {
      kind,
      to,
      sent: false,
      subject: "CB Shipping Solutions — appointment hold",
      text: [
        `Hi ${name},`,
        "",
        `Draft confirmation for a qualified appointment${bookedAt ? ` (${bookedAt})` : ""}.`,
        `${closer} is the closer of record. The outbound desk does not quote a dollar, does not take cards, and does not text.`,
        "Business shipping containers only. Payment talk, if it comes up: wire / ACH / e-check / money order / cashier's check / cash.",
        "",
        "This draft was not sent.",
        "",
        "CB Shipping Solutions outbound desk",
      ].join("\n"),
    };
  }

  return {
    kind,
    to,
    sent: false,
    subject: "CB Shipping Solutions — business containers",
    text: [
      `Hi ${name},`,
      "",
      "Draft intro from the CB Shipping Solutions outbound desk. We set appointments for business shipping containers — not personal storage.",
      "Reply if you want the closer to call. We do not invent a price in this note. We do not send a card checkout link. We do not text.",
      "",
      `Closer of record: ${closer}.`,
      "",
      "This draft was not sent.",
      "",
      "CB Shipping Solutions outbound desk",
    ].join("\n"),
  };
}
