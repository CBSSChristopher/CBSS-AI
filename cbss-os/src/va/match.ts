import { normalizeStage } from "../stages.ts";

export function phoneDigits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

export function phonesMatch(a: unknown, b: unknown): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const a10 = left.length >= 10 ? left.slice(-10) : left;
  const b10 = right.length >= 10 ? right.slice(-10) : right;
  return a10.length === 10 && a10 === b10;
}

export function truthyFlag(value: unknown): boolean {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  return value === true || raw === "yes" || raw === "true" || raw === "1" || raw === "dnc";
}

/** DNC field, DNC stage, or explicit do-not-touch. */
export function isDoNotTouch(contact: Record<string, unknown> | null | undefined): boolean {
  if (!contact) return false;
  if (truthyFlag(contact.dnc) || truthyFlag(contact.doNotTouch) || truthyFlag(contact.do_not_touch)) return true;
  const stage = normalizeStage(contact.status || contact.stage);
  return stage === "DNC";
}

export function emailsMatch(a: unknown, b: unknown): boolean {
  const left = String(a || "").trim().toLowerCase();
  const right = String(b || "").trim().toLowerCase();
  return Boolean(left && right && left.includes("@") && left === right);
}

export function matchCrmContact(
  contacts: unknown,
  hint: { contactId?: string; phone?: string; email?: string },
): Record<string, unknown> | null {
  const rows = Array.isArray(contacts) ? contacts : [];
  const id = String(hint.contactId || "").trim();
  if (id) {
    const hit = rows.find((row) => {
      const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return String(rec.id || "").trim() === id;
    });
    if (hit && typeof hit === "object") return hit as Record<string, unknown>;
  }
  const phone = hint.phone || "";
  if (phoneDigits(phone)) {
    const hit = rows.find((row) => {
      const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return phonesMatch(phone, rec.phone) || phonesMatch(phone, rec.mobile);
    });
    if (hit && typeof hit === "object") return hit as Record<string, unknown>;
  }
  const email = hint.email || "";
  if (email) {
    const hit = rows.find((row) => {
      const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return emailsMatch(email, rec.email);
    });
    if (hit && typeof hit === "object") return hit as Record<string, unknown>;
  }
  return null;
}
