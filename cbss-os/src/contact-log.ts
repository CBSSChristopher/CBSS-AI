export const CONTACT_CHANGE_LABELS: Record<string, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  city: "city",
  state: "state",
  zip: "ZIP",
  company: "company",
  owner: "owner",
  status: "stage",
  source: "source",
  clientType: "client type",
  containerSize: "size",
  condition: "condition",
  depot: "depot",
  delivery: "delivery",
  paymentMode: "payment",
  amount: "amount",
  wholesale: "wholesale",
  dnc: "DNC",
};

function displayValue(key: string, value: unknown): string {
  if (key === "dnc") return value ? "yes" : "no";
  return String(value == null ? "" : value).trim();
}

export function formatContactChanges(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(patch || {})) {
    const label = CONTACT_CHANGE_LABELS[key];
    if (!label) continue;
    const oldV = displayValue(key, before ? before[key] : "");
    const newV = displayValue(key, patch[key]);
    if (oldV === newV) continue;
    lines.push(label + " changed from " + (oldV || "—") + " to " + (newV || "—"));
  }
  return lines;
}

export function contactChangeNote(actor: string, lines: string[]): string {
  const who = String(actor || "").trim();
  const body = lines.join(". ");
  if (!body) return "";
  return who ? who + " · " + body + "." : body + ".";
}

export function contactNameChoices(names: string[], current: string): string[] {
  const set = new Set<string>();
  const cur = String(current || "").trim();
  if (cur) set.add(cur);
  for (const name of names || []) {
    const n = String(name || "").trim();
    if (n) set.add(n);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function ownerChoices(team: readonly string[], current: string): string[] {
  const cur = String(current || "").trim();
  const list = Array.from(new Set((team || []).map((n) => String(n || "").trim()).filter(Boolean)));
  if (cur && !list.includes(cur)) list.unshift(cur);
  return list;
}
