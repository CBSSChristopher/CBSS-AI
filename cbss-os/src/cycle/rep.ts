import { isCompanyEmail } from "../auth.ts";
import { titleOwner } from "../brand.ts";

export type ActiveUser = {
  email: string;
  name: string;
  title: string;
  lastLogin: string;
};

export function companyMail(localOrEmail: string): string {
  const raw = String(localOrEmail || "").trim().toLowerCase();
  if (!raw) return "";
  if (isCompanyEmail(raw)) return raw;
  const local = raw.includes("@") ? raw.split("@")[0] : raw.replace(/[^a-z0-9.]/g, "");
  return local ? `${local}@cbshippingsolutions.com` : "";
}

export function firstNameOf(name: string): string {
  return String(name || "").trim().split(/\s+/).filter(Boolean)[0] || "";
}

export function resolveAssignedRep(
  owner: string,
  users: ActiveUser[],
): { ok: true; user: ActiveUser } | { ok: false; reason: string } {
  const raw = String(owner || "").trim();
  if (!raw || titleOwner(raw) === "New/Unassigned") {
    return { ok: false, reason: "No assigned rep. Pause until a current Yard user owns this contact." };
  }
  if (isCompanyEmail(raw)) {
    const hit = users.find((u) => u.email === raw.toLowerCase());
    if (hit) return { ok: true, user: hit };
    return { ok: false, reason: "Assigned email is not an active Yard user. Pause — do not guess." };
  }
  const titled = titleOwner(raw);
  const byTitle = users.find((u) => titleOwner(u.name) === titled || titleOwner(u.title) === titled);
  if (byTitle) return { ok: true, user: byTitle };
  const byLocal = users.find((u) => titleOwner(u.email.split("@")[0]) === titled);
  if (byLocal) return { ok: true, user: byLocal };
  return { ok: false, reason: "Assigned rep has no active Yard login / company email. Pause — do not guess." };
}

export function officeCopy(): string[] {
  const host = "cbshippingsolutions.com";
  return [`christopher@${host}`, `aliyah@${host}`];
}
