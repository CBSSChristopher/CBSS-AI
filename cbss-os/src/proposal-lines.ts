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

export type ClientProposalOption = {
  letter: string;
  label: string;
  size: string;
  height: string;
  config: string;
  configLabel: string;
  grade: string;
  qty: number;
  cash: number;
  depotCity: string;
  warranty: string;
  fulfillment: string;
  notes: string;
  wholesale: number;
  delivery: number;
  margin: number;
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

const GRADE_LABELS: Record<string, string> = {
  cw: "Cargo Worthy",
  wwt: "Wind & Water Tight",
  onetrip: "One-Trip",
  iicl: "IICL / Multi-Trip",
  asis: "As-Is",
};

function str(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function moneyNum(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function gradeKey(grade: string): string {
  return str(grade).toLowerCase().replace(/[\s_\-/().]/g, "");
}

export function normalizeGrade(grade: string): string {
  const n = gradeKey(grade);
  if (n === "cw" || n.includes("cargo")) return "CW";
  if (n === "wwt" || n.includes("wind") || n.includes("water")) return "WWT";
  if (n.includes("onetrip") || n === "new") return "OneTrip";
  if (n.includes("iicl") || n.includes("multi")) return "IICL";
  if (n.includes("asis")) return "AsIs";
  return str(grade) || "CW";
}

export function gradeLabel(grade: string): string {
  const key = gradeKey(normalizeGrade(grade));
  return GRADE_LABELS[key] || str(grade) || "Container";
}

export function warrantyForGrade(grade: string): string {
  return normalizeGrade(grade) === "OneTrip"
    ? "10-year structural + 10-year no-leak warranty"
    : "5-year structural + 5-year no-leak warranty";
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + Math.max(0, index));
}

/** City/state only. Never a yard name with a posted number. */
export function depotCityOnly(raw: unknown): string {
  const s = str(raw);
  if (!s) return "";
  const tail = s.match(/([A-Za-z .'-]+,\s*[A-Z]{2})\s*$/);
  if (tail) return tail[1].replace(/\s+/g, " ").trim();
  return s.replace(/\s+/g, " ");
}

/** Strip posted / wholesale / delivery / margin dollars from any client-facing string. */
export function sanitizeClientNotes(text: unknown): string {
  let s = str(text);
  if (!s) return "";
  s = s.replace(/\bposted\b[^.\n]*/gi, "");
  s = s.replace(/\bwholesale\b[^.\n]*/gi, "");
  s = s.replace(/\bdelivery\s+\$?[\d,]+(?:\.\d+)?/gi, "");
  s = s.replace(/\bmargin\s+\$?[\d,]+(?:\.\d+)?/gi, "");
  s = s.replace(/\s*·\s*·+/g, " · ");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.replace(/^[ ·]+|[ ·]+$/g, "").trim();
}

export function notesHaveCostLeak(text: unknown): boolean {
  const s = String(text == null ? "" : text);
  return /\bposted\b/i.test(s) || /\bdelivery\s+\$?\d/i.test(s) || /\bwholesale\b/i.test(s);
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

export function clientLineNote(line: ProposalLine): string {
  const depot = depotCityOnly(line.city || line.depot);
  return [describeLine(line), depot ? "depot " + depot : ""].filter(Boolean).join(" · ");
}

export function optionKey(line: ProposalLine): string {
  return [str(line.size), str(line.height), str(line.config), normalizeGrade(line.grade)].join("|");
}

export function groupProposalOptions(lines: ProposalLine[]): {
  options: ClientProposalOption[];
  chooseOne: boolean;
} {
  const clean = (Array.isArray(lines) ? lines : []).filter((line) => line && line.wholesale > 0 && line.cash > 0);
  const groups = new Map<string, ProposalLine[]>();
  for (const line of clean) {
    const key = optionKey(line);
    const bucket = groups.get(key) || [];
    bucket.push(line);
    groups.set(key, bucket);
  }
  const options = [...groups.values()].map((bucket, index) => {
    const first = bucket[0];
    const qty = bucket.reduce((sum, row) => sum + Math.max(1, Number(row.qty) || 1), 0);
    const wholesale = first.wholesale;
    const delivery = first.fulfillment === "pickup" ? 0 : first.delivery;
    const cash = first.cash;
    const grade = normalizeGrade(first.grade);
    return {
      letter: optionLetter(index),
      label: gradeLabel(grade),
      size: first.size,
      height: first.height,
      config: first.config,
      configLabel: first.configLabel || "Standard",
      grade,
      qty,
      cash,
      depotCity: depotCityOnly(first.city || first.depot),
      warranty: warrantyForGrade(grade),
      fulfillment: first.fulfillment === "pickup" ? "pickup" : "deliver",
      notes: clientLineNote({ ...first, qty }),
      wholesale,
      delivery,
      margin: first.margin,
    } satisfies ClientProposalOption;
  });
  return {
    options,
    chooseOne: options.length >= 2,
  };
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
  options: ClientProposalOption[];
  chooseOne: boolean;
} {
  const empty = {
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
    miles: "" as const,
    options: [] as ClientProposalOption[],
    chooseOne: false,
  };
  const clean = (Array.isArray(lines) ? lines : []).filter((line) => line && line.wholesale > 0 && line.cash > 0);
  if (!clean.length) {
    return {
      ok: false,
      error: "Get a posted CBSS price on at least one box first. Do not invent a wholesale.",
      ...empty,
    };
  }
  const grouped = groupProposalOptions(clean);
  let wholesaleCost = 0;
  let deliveryCost = 0;
  let quotedCash = 0;
  let quantity = 0;
  const depots = new Set<string>();
  for (const line of clean) {
    const qty = Math.max(1, Number(line.qty) || 1);
    quantity += qty;
    wholesaleCost += line.wholesale * qty;
    quotedCash += line.cash * qty;
    deliveryCost += (line.fulfillment === "pickup" ? 0 : line.delivery) * qty;
    const depot = depotCityOnly(line.city || line.depot);
    if (depot) depots.add(depot);
  }
  const first = clean[0];
  const sameSize = clean.every((line) => rateSheetSize(line.size, line.config) === rateSheetSize(first.size, first.config));
  const clientNotes = grouped.options.map((option) => option.notes).join("\n");
  const desc = grouped.chooseOne
    ? grouped.options.map((option) => "Option " + option.letter + " " + option.qty + " × " + option.size + " ft " + option.label).join("; ")
    : clean.map(describeLine).join("; ");
  const primary = grouped.options[0];
  return {
    ok: true,
    containerDesc: desc,
    containerNotes: sanitizeClientNotes(clientNotes),
    quantity: grouped.chooseOne ? primary.qty : quantity,
    wholesaleCost,
    unitPrice: primary.cash,
    deliveryCost,
    netMargin: quotedCash - wholesaleCost - deliveryCost,
    containerSize: sameSize ? rateSheetSize(first.size, first.config) : "Specialized",
    condition: grouped.chooseOne
      ? grouped.options.map((option) => option.grade).join(" or ")
      : grouped.options.length === 1
        ? primary.grade
        : grouped.options.map((option) => option.grade).join(" + "),
    depot: [...depots].join(" | "),
    depotCity: primary.depotCity || depotCityOnly(first.city || first.depot),
    miles: first.miles == null ? "" : first.miles,
    options: grouped.options,
    chooseOne: grouped.chooseOne,
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
  const extra = sanitizeClientNotes(draft.notes);
  const notes = [combined.containerNotes, extra].filter(Boolean).join("\n");
  if (notesHaveCostLeak(notes) || notesHaveCostLeak(combined.containerNotes)) {
    return { ok: false, error: "Client notes cannot include posted or delivery dollars." };
  }
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
      notes,
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
      options: combined.options,
      chooseOne: combined.chooseOne,
    },
  };
}
