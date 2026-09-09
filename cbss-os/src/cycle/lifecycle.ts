export const LIFECYCLES = ["New", "Working", "Quoted", "Invoiced", "Paid", "Delivered"] as const;
export const EXITS = ["Lost", "Not interested", "Bought elsewhere"] as const;
export type Lifecycle = (typeof LIFECYCLES)[number] | (typeof EXITS)[number];

const LEGACY_TO_LIFECYCLE: Record<string, Lifecycle> = {
  "new lead": "New",
  new: "New",
  contacted: "Working",
  "cte in progress": "Working",
  "follow up in progress": "Working",
  "email campaign": "Working",
  working: "Working",
  quote: "Quoted",
  quoted: "Quoted",
  "proposal sent": "Quoted",
  "flex buy": "Quoted",
  invoiced: "Invoiced",
  paid: "Paid",
  won: "Paid",
  delivered: "Delivered",
  lost: "Lost",
  dnc: "Lost",
  "not interested": "Not interested",
  "bought elsewhere": "Bought elsewhere",
};

const LIFECYCLE_TO_LEGACY: Record<Lifecycle, string> = {
  New: "New Lead",
  Working: "CTE in progress",
  Quoted: "Quote",
  Invoiced: "Proposal Sent",
  Paid: "Won",
  Delivered: "Won",
  Lost: "Lost",
  "Not interested": "Lost",
  "Bought elsewhere": "Lost",
};

export function normalizeLifecycle(raw: unknown, fallback?: unknown): Lifecycle | "" {
  const direct = LEGACY_TO_LIFECYCLE[String(raw || "").trim().toLowerCase()];
  if (direct) return direct;
  const second = LEGACY_TO_LIFECYCLE[String(fallback || "").trim().toLowerCase()];
  return second || "";
}

export function legacyStatusFor(life: Lifecycle): string {
  return LIFECYCLE_TO_LEGACY[life] || "New Lead";
}

export type CrmLifecyclePatch = {
  status: string;
  invoicePaid?: "yes";
};

/** CRM list / card fields that must follow Lifecycle so Paid cannot sit on Proposal Sent + invoice paid No. */
export function crmPatchForLifecycle(life: Lifecycle): CrmLifecyclePatch {
  const status = legacyStatusFor(life);
  if (life === "Paid" || life === "Delivered") return { status, invoicePaid: "yes" };
  return { status };
}

export function isExit(life: string): boolean {
  return (EXITS as readonly string[]).includes(life);
}

export function isOpenLifecycle(life: string): boolean {
  return (LIFECYCLES as readonly string[]).includes(life);
}
