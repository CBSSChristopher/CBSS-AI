/** Multi-box proposal lines. Each line needs a posted wholesale. Do not invent a price. */

export type ProposalLine = {
  size: string;
  height: string;
  config: string;
  configLabel: string;
  grade: string;
  qty: number;
  wholesale: number;
  delivery: number;
  margin: number;
  cash: number;
  city?: string;
  depot?: string;
  miles?: number | null;
  place?: string;
  fulfillment: string;
};

export type ProposalSubmitDraft = {
  customerName?: string;
  email?: string;
  phone?: string;
  company?: string;
  zip?: string;
  delivery?: string;
  notes?: string;
  clientType?: string;
  paymentMode?: string;
  fulfillment?: string;
  repName?: string;
  repEmail?: string;
  lines?: ProposalLine[];
};

function str(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function moneyNum(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Delivery rate-sheet bucket only. A 10' uses 20ft haul rates; a 45' uses 40ft haul rates.
 *  Posted-box match and the proposal line still use the exact size (10 ≠ 20, 45 ≠ 40). */
export function rateSheetSize(size: string, config: string): string {
  if (config && config !== "standard") return "Specialized";
  if (size === "20" || size === "10") return "20ft";
  if (size === "40" || size === "45") return "40ft";
  return "Specialized";
}

export function describeLine(line: ProposalLine): string {
  const qty = Math.max(1, Number(line.qty) || 1);
  const height = line.height === "HC" ? "high cube" : line.height === "DC" ? "standard" : str(line.height);
  const bits = [line.size ? line.size + " ft" : "", height, line.configLabel || line.config, line.grade].filter(Boolean);
  return bits.join(" ") + (qty > 1 ? " × " + qty : "");
}

export function readProposalLine(raw: Record<string, unknown>, configLabel = ""): ProposalLine | null {
  const wholesale = moneyNum(raw.wholesale ?? raw.wholesaleCost);
  const cash = moneyNum(raw.cash ?? raw.unitPrice ?? raw.proposalEach);
  if (wholesale <= 0 || cash <= 0) return null;
  const qty = Math.max(1, Number(raw.qty ?? raw.quantity) || 1);
  return {
    size: str(raw.size) || "40",
    height: str(raw.height) || "HC",
    config: str(raw.config) || "standard",
    configLabel: str(raw.configLabel) || configLabel || "Standard",
    grade: str(raw.grade) || str(raw.condition) || "CW",
    qty,
    wholesale,
    delivery: Math.max(0, moneyNum(raw.delivery ?? raw.deliveryCost)),
    margin: Math.max(300, moneyNum(raw.margin ?? raw.netMargin) || 700),
    cash,
    city: str(raw.city),
    depot: str(raw.depot),
    miles: raw.miles == null || raw.miles === "" ? null : Number(raw.miles),
    place: str(raw.place),
    fulfillment: str(raw.fulfillment) === "pickup" ? "pickup" : "deliver",
  };
}

export function combineProposalLines(lines: ProposalLine[]): {
  ok: boolean;
  error?: string;
  containerDesc: string;
  containerNotes: string;
  quantity: number;
  wholesaleCost: number;
  unitPrice: number;
  deliveryCost: number;
  netMargin: number;
  containerSize: string;
  condition: string;
  depot: string;
  depotCity: string;
  miles: number | "";
} {
  const clean = (Array.isArray(lines) ? lines : []).filter((line) => line && line.wholesale > 0 && line.cash > 0);
  if (!clean.length) {
    return {
      ok: false,
      error: "Get a posted CBSS price on at least one box first. Do not invent a wholesale.",
      containerDesc: "",
      containerNotes: "",
      quantity: 0,
      wholesaleCost: 0,
      unitPrice: 0,
      deliveryCost: 0,
      netMargin: 0,
      containerSize: "40ft",
      condition: "",
      depot: "",
      depotCity: "",
      miles: "",
    };
  }
  let wholesaleCost = 0;
  let unitPrice = 0;
  let deliveryCost = 0;
  let quantity = 0;
  const desc: string[] = [];
  const notes: string[] = [];
  const depots = new Set<string>();
  for (const line of clean) {
    const qty = Math.max(1, Number(line.qty) || 1);
    quantity += qty;
    wholesaleCost += line.wholesale * qty;
    unitPrice += line.cash * qty;
    deliveryCost += (line.fulfillment === "pickup" ? 0 : line.delivery) * qty;
    desc.push(describeLine(line));
    const depot = line.city || line.depot || "";
    if (depot) depots.add(depot);
    notes.push(
      describeLine(line)
        + " · posted " + line.wholesale
        + (line.fulfillment === "pickup" ? " · pickup" : " · delivery " + line.delivery)
        + (depot ? " · depot " + depot : ""),
    );
  }
  const first = clean[0];
  const sameSize = clean.every((line) => rateSheetSize(line.size, line.config) === rateSheetSize(first.size, first.config));
  return {
    ok: true,
    containerDesc: desc.join("; "),
    containerNotes: notes.join("\n"),
    quantity,
    wholesaleCost,
    unitPrice,
    deliveryCost,
    netMargin: unitPrice - wholesaleCost - deliveryCost,
    containerSize: sameSize ? rateSheetSize(first.size, first.config) : "Specialized",
    condition: clean.length === 1 ? first.grade : clean.map((line) => line.grade).join(" + "),
    depot: [...depots].join(" | "),
    depotCity: first.city || first.depot || "",
    miles: first.miles == null ? "" : first.miles,
  };
}

export function buildProposalSubmit(draft: ProposalSubmitDraft): { ok: boolean; error?: string; body?: Record<string, unknown> } {
  const customerName = str(draft.customerName);
  const repName = str(draft.repName) || str(draft.repEmail);
  const repEmail = str(draft.repEmail);
  if (!customerName) return { ok: false, error: "Name the customer before you submit the proposal." };
  if (!repName || !repEmail) return { ok: false, error: "Sign in again so the proposal can go to your company email." };
  const combined = combineProposalLines(draft.lines || []);
  if (!combined.ok) return { ok: false, error: combined.error };
  const extra = str(draft.notes);
  return {
    ok: true,
    body: {
      customerName,
      email: str(draft.email),
      phone: str(draft.phone),
      company: str(draft.company),
      zip: str(draft.zip),
      delivery: str(draft.delivery),
      quantity: String(combined.quantity),
      wholesaleCost: combined.wholesaleCost,
      unitPrice: combined.unitPrice,
      netMargin: combined.netMargin,
      fulfillment: str(draft.fulfillment) === "pickup" ? "pickup" : "deliver",
      containerSize: combined.containerSize,
      condition: combined.condition,
      notes: [combined.containerNotes, extra].filter(Boolean).join("\n"),
      containerNotes: combined.containerNotes,
      containerDesc: combined.containerDesc,
      clientType: str(draft.clientType) || "Residential",
      paymentMode: str(draft.paymentMode) || "cash",
      repName,
      repEmail,
      depot: combined.depot,
      depotCity: combined.depotCity,
      miles: combined.miles,
      deliveryCost: combined.deliveryCost,
    },
  };
}
