import { isCompanyEmail } from "../auth.ts";
import { TEAM_OWNERS, titleOwner } from "../brand.ts";

export type ActiveUser = {
  email: string;
  name: string;
  title: string;
  lastLogin: string;
};

export type RepResolution =
  | { ok: true; user: ActiveUser; source: "active" | "roster" }
  | { ok: false; reason: string };

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

function isRosterOwner(name: string): boolean {
  return (TEAM_OWNERS as readonly string[]).includes(name) && name !== "New/Unassigned";
}

/** Known CBSS sales roster → company email. Does not invent addresses for unknown names. */
export function rosterCompanyEmail(owner: string): string {
  const titled = titleOwner(owner);
  if (!isRosterOwner(titled)) return "";
  const local = firstNameOf(titled).toLowerCase();
  return companyMail(local);
}

function rosterUser(owner: string, email = ""): ActiveUser | null {
  const titled = titleOwner(owner);
  const rosterMail = rosterCompanyEmail(owner);
  if (!titled || !rosterMail) return null;
  const mail = String(email || "").trim().toLowerCase();
  return {
    email: mail && isCompanyEmail(mail) ? mail : rosterMail,
    name: titled,
    title: titled,
    lastLogin: "",
  };
}

export function resolveAssignedRep(
  owner: string,
  users: ActiveUser[],
  opts: { allowRoster?: boolean } = {},
): RepResolution {
  const raw = String(owner || "").trim();
  if (!raw || titleOwner(raw) === "New/Unassigned") {
    return { ok: false, reason: "No assigned rep. Pause until a current Yard user owns this contact." };
  }
  if (isCompanyEmail(raw)) {
    const hit = users.find((u) => u.email === raw.toLowerCase());
    if (hit) return { ok: true, user: hit, source: "active" };
    if (opts.allowRoster) {
      const roster = rosterUser(raw, raw.toLowerCase());
      if (roster) return { ok: true, user: roster, source: "roster" };
    }
    return { ok: false, reason: "Assigned email is not an active Yard user. Pause — do not guess." };
  }
  const titled = titleOwner(raw);
  const byTitle = users.find((u) => titleOwner(u.name) === titled || titleOwner(u.title) === titled);
  if (byTitle) return { ok: true, user: byTitle, source: "active" };
  const byLocal = users.find((u) => titleOwner(u.email.split("@")[0]) === titled);
  if (byLocal) return { ok: true, user: byLocal, source: "active" };
  if (opts.allowRoster) {
    const roster = rosterUser(raw);
    if (roster) return { ok: true, user: roster, source: "roster" };
  }
  return { ok: false, reason: "Assigned rep has no active Yard login / company email. Pause — do not guess." };
}

/** Paid Next Steps office CC. sendAgentMail also forces Christopher on every send. */
export function officeCopy(): string[] {
  const host = "cbshippingsolutions.com";
  return [`christopher@${host}`, `aliyah@${host}`];
}
