export const BRAND = {
  navy: "#0B1F3A",
  gold: "#C9A227",
  paper: "#F7F4EC",
  company: "CBGC LLC DBA CB Shipping Solutions",
  title: "CBSS Platform",
  stamp: "build 3 · side platform · live tools unchanged",
} as const;

export const TEAM_OWNERS = [
  "Christopher Banks",
  "James",
  "Bryan Reese",
  "Matthew Brent",
  "Kawika Pangelinan",
  "Aliyah",
  "Brittni",
  "Derrek Clements",
  "New/Unassigned",
] as const;

export const LIVE_TOOLS = {
  crm: "https://cbsscrm.cbss.workers.dev",
  desk: "https://cbssbrain.cbss.workers.dev",
  proposal: "https://cbsscompletetool.cbss.workers.dev",
  pay: "https://cbsspay.cbss.workers.dev",
  invoice: "https://cbssinvoice.cbss.workers.dev",
} as const;

export const MODULES = ["CRM", "Desk", "Proposal", "Money"] as const;
