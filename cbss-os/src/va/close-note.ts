import { PAYMENT_PATH_LINE, pickReadyToBuyLine, type SpokenLine } from "./scripts.ts";

export type HarborDealFields = {
  quoted?: unknown;
  size?: unknown;
  type?: unknown;
  condition?: unknown;
  delivery?: unknown;
  objections?: unknown;
  promises?: unknown;
  price?: unknown;
};

function clip(value: unknown, max = 240): string {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function field(label: string, value: unknown): string {
  return label + ": " + (clip(value) || "not stated");
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
    objections: src.objections ?? nested.objections,
    promises: src.promises ?? src.softPromises ?? nested.promises ?? nested.softPromises,
    price: src.price ?? src.exactPrice ?? nested.price ?? nested.exactPrice,
  };
}

export function sizeTypeCondition(deal: HarborDealFields): string {
  const bits = [clip(deal.size), clip(deal.type), clip(deal.condition)].filter(Boolean);
  return bits.join(" / ");
}

export function buildReadyToBuyNote(input: {
  cte: string;
  closer: string;
  inbound?: boolean;
  spoken?: SpokenLine | string;
  deal?: HarborDealFields;
  extra?: string;
  seed?: unknown;
  now?: number;
}): string {
  const spoken = typeof input.spoken === "string" && input.spoken.trim()
    ? { id: "custom", spoken: input.spoken.trim() }
    : input.spoken && typeof input.spoken === "object"
      ? input.spoken
      : pickReadyToBuyLine(input.seed, input.now);
  const deal = input.deal || {};
  const head =
    (input.inbound ? "Harbor inbound · CTE " : "Harbor · CTE ") +
    input.cte +
    " · Ready to buy. Handed to " +
    input.closer +
    " for final close + payment. " +
    PAYMENT_PATH_LINE;
  const lines = [
    head,
    "Spoken (" + spoken.id + "): " + spoken.spoken,
    field("Quoted", deal.quoted),
    field("Size / type / condition", sizeTypeCondition(deal)),
    field("Delivery / pickup", deal.delivery),
    field("Objections cleared", deal.objections),
    field("Soft promises", deal.promises),
    field("Exact price", deal.price),
    "Payment path reminder: " + PAYMENT_PATH_LINE,
  ];
  const extra = clip(input.extra, 400);
  if (extra) lines.push(extra);
  return lines.join("\n");
}
