import { titleOwner } from "./brand.ts";

function str(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function normEmail(value: unknown): string {
  return str(value).toLowerCase();
}

function normPhone(value: unknown): string {
  const digits = str(value).replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function moneyText(value: unknown): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.round(n * 100) / 100);
}

export function matchContactForProposal(
  contacts: Array<Record<string, unknown>>,
  hint: { id?: unknown; email?: unknown; phone?: unknown; name?: unknown },
): Record<string, unknown> | null {
  const rows = Array.isArray(contacts) ? contacts.filter((row) => row && typeof row === "object") : [];
  const id = str(hint.id);
  if (id) {
    const hit = rows.find((row) => String(row.id) === id);
    if (hit) return hit;
  }
  const email = normEmail(hint.email);
  if (email) {
    const hits = rows.filter((row) => normEmail(row.email) === email);
    if (hits.length === 1) return hits[0];
  }
  const phone = normPhone(hint.phone);
  if (phone.length >= 7) {
    const hits = rows.filter((row) => normPhone(row.phone) === phone);
    if (hits.length === 1) return hits[0];
  }
  const name = str(hint.name).toLowerCase();
  if (name) {
    const hits = rows.filter((row) => str(row.name).toLowerCase() === name);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

export function proposalAttachPatch(input: {
  unitPrice?: unknown;
  containerDesc?: unknown;
  quantity?: unknown;
  owner?: unknown;
}): { amount: string; status: string; owner: string; note: string } {
  const amount = moneyText(input.unitPrice);
  const desc = str(input.containerDesc) || "Proposal";
  const qty = str(input.quantity);
  const owner = titleOwner(str(input.owner));
  const bits = [desc];
  if (qty) bits.push("qty " + qty);
  if (amount) bits.push("proposal $" + amount);
  return {
    amount,
    status: "Proposal Sent",
    owner,
    note: bits.join(" · ") + ". Attached to this contact when the proposal was written.",
  };
}
