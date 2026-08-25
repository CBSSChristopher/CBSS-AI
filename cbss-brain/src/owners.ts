export const COMPANY_EMAIL_RE = /@cbshippingsolutions\.com$/i;

export const STAFF_OWNERS: Record<string, string> = {
  christopher: "Christopher Banks",
  james: "James",
  bryan: "Bryan Reese",
  matthew: "Matthew Brent",
  veeka: "Kawika Pangelinan",
  veek: "Kawika Pangelinan",
  ivyanna: "Ivyanna",
  aliyah: "Aliyah",
  kyle: "Kyle",
  mery: "Mery",
  terrell: "Terrell",
  joshua: "Joshua",
};

export function titleCaseWords(value: string): string {
  return String(value == null ? "" : value)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function companyEmailLocal(value: string): string {
  const raw = String(value == null ? "" : value).trim();
  const match = raw.match(/^([^@\s]+)@cbshippingsolutions\.com$/i);
  return match ? match[1].toLowerCase() : "";
}

export function canonicalizeOwner(value: string): string {
  const raw = String(value == null ? "" : value)
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return "";
  if (/^contact owner$/i.test(raw)) return "";
  const local = companyEmailLocal(raw);
  if (local) return STAFF_OWNERS[local] || titleCaseWords(local.replace(/[._-]+/g, " "));
  const lower = raw.toLowerCase();
  if (STAFF_OWNERS[lower]) return STAFF_OWNERS[lower];
  const titled = titleCaseWords(raw);
  const titledLocal = companyEmailLocal(titled);
  if (titledLocal) return STAFF_OWNERS[titledLocal] || titleCaseWords(titledLocal.replace(/[._-]+/g, " "));
  return STAFF_OWNERS[titled.toLowerCase()] || titled;
}

export function resolveSessionOwner(name?: string, email?: string): string {
  return canonicalizeOwner(String(name || "")) || canonicalizeOwner(String(email || "")) || "Desk";
}
