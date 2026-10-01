/** Flex Buy terms on a posted cash ticket. Never invent a wholesale or a customer cash price. */

export const FLEX_TERMS = [
  { months: 6, apr: 0.12 },
  { months: 12, apr: 0.14 },
  { months: 18, apr: 0.15 },
  { months: 24, apr: 0.16 },
  { months: 36, apr: 0.18 },
  { months: 48, apr: 0.20 },
  { months: 60, apr: 0.22 },
  { months: 72, apr: 0.24 },
] as const;

export type FlexTerm = (typeof FLEX_TERMS)[number];

export type FlexBuyQuote = {
  months: number;
  apr: number;
  monthly: number;
  upfront: number;
  financed: number;
  interest: number;
  totalPaid: number;
  downPct: number;
  modPrice: number;
  modDownPct: number;
  quantity: number;
  unitPrice: number;
  deliveryPerUnit: number;
};

function moneyNum(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** 10 or 0.10 both mean 10%. */
export function readPercent(value: unknown, fallback: number, min: number, max: number): number {
  let n = moneyNum(value);
  if (!n) n = fallback;
  if (n > 1) n = n / 100;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function findFlexTerm(months: unknown): FlexTerm | null {
  const n = Math.round(moneyNum(months));
  return FLEX_TERMS.find((row) => row.months === n) || null;
}

/** Same PMT the standalone proposal Flex table uses. */
export function flexPmt(monthlyRate: number, months: number, principal: number): number {
  if (!months) return 0;
  if (!monthlyRate) return principal / months;
  const r = monthlyRate;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function quoteFlexBuy(input: {
  unitPrice: number;
  quantity?: number;
  deliveryPerUnit?: number;
  downPct?: number;
  modPrice?: number;
  modDownPct?: number;
  months: number;
}): { ok: true; quote: FlexBuyQuote } | { ok: false; error: string } {
  const term = findFlexTerm(input.months);
  if (!term) return { ok: false, error: "Pick a Flex Buy term from the table." };
  const unitPrice = money2(input.unitPrice);
  if (unitPrice <= 0) {
    return { ok: false, error: "Get a posted CBSS cash price first. Do not invent a number." };
  }
  const quantity = Math.max(1, Math.round(moneyNum(input.quantity) || 1));
  const deliveryPerUnit = Math.max(0, money2(input.deliveryPerUnit || 0));
  if (deliveryPerUnit > unitPrice) {
    return { ok: false, error: "Delivery cannot be larger than the posted cash price." };
  }
  const downPct = readPercent(input.downPct, 0.1, 0.05, 0.5);
  const modPrice = Math.max(0, money2(input.modPrice || 0));
  const modDownPct = readPercent(input.modDownPct, 0.35, 0.1, 1);
  const containerCash = money2((unitPrice - deliveryPerUnit) * quantity);
  const containerDown = money2(containerCash * downPct);
  const modDown = money2(modPrice * modDownPct);
  const totalDown = money2(containerDown + modDown);
  const financed = money2(containerCash + modPrice - totalDown);
  if (financed < 0) {
    return { ok: false, error: "Flex Buy down payment cannot exceed the cash ticket." };
  }
  const upfront = money2(totalDown + deliveryPerUnit * quantity);
  const monthly = money2(flexPmt(term.apr / 12, term.months, financed));
  const totalPaid = money2(monthly * term.months + totalDown);
  const interest = money2(totalPaid - (containerCash + modPrice));
  return {
    ok: true,
    quote: {
      months: term.months,
      apr: term.apr,
      monthly,
      upfront,
      financed,
      interest,
      totalPaid,
      downPct,
      modPrice,
      modDownPct,
      quantity,
      unitPrice,
      deliveryPerUnit,
    },
  };
}

export function flexSubmitFields(quote: FlexBuyQuote): Record<string, unknown> {
  return {
    paymentMode: "flex",
    flexSelected: true,
    flexTermMonths: String(quote.months),
    flexApr: String(quote.apr),
    flexMonthlyPayment: quote.monthly.toFixed(2),
    flexUpfront: quote.upfront.toFixed(2),
    flexAmountFinanced: quote.financed.toFixed(2),
    flexTotalInterest: quote.interest.toFixed(2),
    flexDownPaymentPct: String(quote.downPct),
    flexModificationPrice: String(quote.modPrice),
  };
}

export function readFlexBuyRequest(raw: Record<string, unknown>): {
  selected: boolean;
  months: number;
  downPct: number;
  modPrice: number;
  modDownPct: number;
} {
  const mode = String(raw.paymentMode == null ? "" : raw.paymentMode).trim().toLowerCase();
  const flagged = raw.flexSelected === true || raw.flexSelected === "true" || mode === "flex";
  return {
    selected: flagged,
    months: Math.round(moneyNum(raw.flexTermMonths ?? raw.flexTerm ?? raw.months)),
    downPct: readPercent(raw.flexDownPaymentPct ?? raw.downPct, 0.1, 0.05, 0.5),
    modPrice: Math.max(0, money2(raw.flexModificationPrice ?? raw.modPrice)),
    modDownPct: readPercent(raw.flexModDownPct ?? raw.modDownPct, 0.35, 0.1, 1),
  };
}
