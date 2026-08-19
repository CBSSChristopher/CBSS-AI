export type TemplateVars = {
  firstName?: string;
  what?: string;
  zip?: string;
  price?: string;
  site?: string;
};

export type EmailTemplate = {
  id: string;
  name: string;
  when: string;
  subject: string;
  body: string;
};

const SIGN =
  "With thanks and my blessings!\nChristopher Banks\nPresident/Owner\nDirect Business Line: (870)-682-3867\nPersonal Phone: (870)-323-2593\nWebsite: Https://cbshippingsolutions.com/";

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "first-reply",
    name: "First reply",
    when: "They just reached out. No official proposal yet.",
    subject: "Thanks for reaching out to CBShippingSolutions",
    body: `Good Morning,

{{firstName}} thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}.

Reply with the delivery ZIP, the size you want, and how we access the site. I will get you a clean delivered-cash number.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
  {
    id: "proposal-attached",
    name: "Proposal attached",
    when: "Official PDF is going with the email.",
    subject: "Your all inclusive proposal from CBShippingSolutions",
    body: `Good Evening,

{{firstName}} thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}. Please see our official proposal attached below.{{priceClause}}

That figure is delivered cash. Standard weekday delivery is already inside it. Do not add freight on top.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
  {
    id: "need-zip",
    name: "Need ZIP / site",
    when: "You have a box in mind but no delivery ZIP or site access.",
    subject: "Quick question so I can lock your container",
    body: `Good Morning,

{{firstName}} thanks for the time. To lock the right box I need the delivery ZIP and how we get a truck to the pad{{siteClause}}.

Reply with those two things and I will send the official proposal.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
  {
    id: "follow-up-quiet",
    name: "Follow-up after no reply",
    when: "You sent a proposal or a first note and they went quiet.",
    subject: "Checking in from CBShippingSolutions",
    body: `Good Morning,

{{firstName}} just checking in from CBShippingSolutions. I still have your request{{whatClause}}{{zipClause}}.

If you want to move, reply here or call me at (870)-323-2593. If the timing changed, that is fine too.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
  {
    id: "got-reply-shopping",
    name: "They are comparing quotes",
    when: "They got the proposal and said they are shopping / will be in touch.",
    subject: "We are here when you are ready",
    body: `Good Morning,

{{firstName}} thanks for the note. Glad the proposal landed. No rush on our side. When you are ready to lock it in, reply here or call (870)-323-2593 and we will get the truck on the calendar.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
  {
    id: "cash-before-truck",
    name: "Home delivery / cash first",
    when: "Residential. Confirm they pay before the truck rolls.",
    subject: "How delivery works with CBShippingSolutions",
    body: `Good Morning,

{{firstName}} thanks for working with CBShippingSolutions. For a home drop, the delivered cash is due before the truck is dispatched. We do not collect on delivery.

Once payment is in, we schedule the weekday drop to a truck-accessible site.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
  {
    id: "cte-text",
    name: "CTE text",
    when: "Short text after the first call did not connect.",
    subject: "",
    body: `Hey {{firstName}} — Christopher with CBShippingSolutions. I tried you earlier about a container{{zipClause}}. What ZIP and size are you looking at? I can get you a delivered-cash number. 870-323-2593`,
  },
  {
    id: "ready-to-lock",
    name: "Ready to lock",
    when: "They said yes. Confirm next step. Do not invent a new price.",
    subject: "Let’s lock your container",
    body: `Good Morning,

{{firstName}} glad we are moving. Reply with the delivery address and the best phone for the driver.{{priceClause}}

Home drops are paid before the truck. I will confirm the weekday window as soon as we have the site.

IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.

${SIGN}`,
  },
];

function firstNameOf(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "there";
  return t.split(/\s+/)[0];
}

function clause(prefix: string, value: string, empty = ""): string {
  const v = String(value || "").trim();
  return v ? prefix + v : empty;
}

export function listTemplates(): Array<{ id: string; name: string; when: string; subject: string }> {
  return EMAIL_TEMPLATES.map((t) => ({ id: t.id, name: t.name, when: t.when, subject: t.subject }));
}

export function renderTemplate(id: string, vars: TemplateVars = {}): { id: string; name: string; subject: string; body: string } | null {
  const t = EMAIL_TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  const firstName = firstNameOf(vars.firstName || "");
  const what = String(vars.what || "").trim();
  const zip = String(vars.zip || "").trim();
  const price = String(vars.price || "").trim();
  const site = String(vars.site || "").trim();
  const fill = (s: string) =>
    s
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{whatClause\}\}/g, clause(" for ", what))
      .replace(/\{\{zipClause\}\}/g, clause(" for zip ", zip))
      .replace(/\{\{priceClause\}\}/g, price ? ` The delivered cash figure we quoted is ${price}.` : "")
      .replace(/\{\{siteClause\}\}/g, clause(" — ", site))
      .replace(/\{\{what\}\}/g, what || "a container")
      .replace(/\{\{zip\}\}/g, zip)
      .replace(/\{\{price\}\}/g, price);
  return { id: t.id, name: t.name, subject: fill(t.subject), body: fill(t.body).replace(/\n{3,}/g, "\n\n") };
}
