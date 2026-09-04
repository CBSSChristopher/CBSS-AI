export const BRAND = {
  navy: "#0B1F3A",
  gold: "#C9A227",
  paper: "#F7F4EC",
  company: "CBGC LLC DBA CB Shipping Solutions",
  title: "The Yard",
  stamp: "build 17 · The Yard",
} as const;

export const SALES_SPARKS = [
  "The next yes is one honest conversation away.",
  "Call them back before they find a slower shop.",
  "You don't sell steel. You sell a yard that shows up.",
  "Book the call. Send the quote. Collect the cash.",
  "A quiet pipeline is a choice. Make some noise.",
  "Today's follow-up is tomorrow's delivery.",
  "They already need the box. Be the one who answers.",
  "Nobody closed a deal they were too proud to dial.",
  "One more conversation. That's how the day turns.",
  "Speed is the close. Hesitation is the competitor.",
  "Every name on that list is a chance somebody else will miss.",
  "Write the proposal while the yes is still warm.",
] as const;

export const TEAM_OWNERS = [
  "Christopher Banks",
  "James",
  "Kyle Hodgkiss",
  "Bryan Reese",
  "Matthew Brent",
  "Kawika Pangelinan",
  "Aliyah",
  "Brittni Keeling",
  "Derrek Clements",
  "New/Unassigned",
] as const;

export const OWNER_ALIASES: Record<string, string> = {
  christopher: "Christopher Banks",
  james: "James",
  kyle: "Kyle Hodgkiss",
  bryan: "Bryan Reese",
  matthew: "Matthew Brent",
  veeka: "Kawika Pangelinan",
  veek: "Kawika Pangelinan",
  aliyah: "Aliyah",
  brittni: "Brittni Keeling",
  derrek: "Derrek Clements",
};

export function titleOwner(value: string): string {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (compact === "new/unassigned" || compact === "newunassigned" || compact === "unassigned") return "New/Unassigned";
  if (compact === "kylehodgkiss") return "Kyle Hodgkiss";
  const first = raw.split(/[\s@]/)[0].toLowerCase();
  return OWNER_ALIASES[first] || raw;
}

/** Floor bookmark. New host so Safari's cached HTTP/3 on theyard does not apply. */
export const YARD_PUBLIC = "https://yard.cbshippingsolutions.app";

export const LIVE_TOOLS = {
  crm: "https://cbsscrm.cbss.workers.dev",
  desk: "https://cbssbrain.cbss.workers.dev",
  proposal: "https://cbsscompletetool.cbss.workers.dev",
  pay: "https://cbsspay.cbss.workers.dev",
  invoice: "https://cbssinvoice.cbss.workers.dev",
} as const;

export const MODULES = ["CRM", "Desk", "Proposal", "Modified", "Money"] as const;
