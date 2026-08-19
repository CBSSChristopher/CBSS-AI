export type TemplateVars = {
  firstName?: string;
  what?: string;
  zip?: string;
  price?: string;
  site?: string;
  day?: string;
  note?: string;
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

const IF_Q =
  "IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.";

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "first-reply",
    name: "1st — quote request, I will call",
    when: "They just filled the form. No PDF yet. Chris emails, then calls the same day.",
    subject: "Your quote request from CBShippingSolutions",
    body: `Good Morning{{happyDay}}!

{{firstName}}, thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}.

I will give you a call today{{dayClause}} to go over options and get you a number. If you need me before then, my direct line is (870)-682-3867.

${SIGN}`,
  },
  {
    id: "cte-email",
    name: "1st email after missed call + text",
    when: "CTE. You already called and texted. This is the email. Not a 4th reconnect.",
    subject: "Your shipping container needs",
    body: `Hey {{firstName}}!

I tried reaching out by phone and text recently regarding your shipping container needs, but I might have caught you at a busy time.

As the Owner of CBShippingSolutions, I just wanted to follow up. We keep the process of buying a container clear and straightforward so you get what you need without surprises.

If you are still exploring options, reply here or call or text me at (870)-323-2593 and I will set aside a few minutes.

${SIGN}`,
  },
  {
    id: "cte-text",
    name: "CTE text",
    when: "Short text after the first call did not connect. Not an email.",
    subject: "",
    body: `Hey {{firstName}} — Christopher with CBShippingSolutions. I tried you earlier about a container{{zipClause}}. What ZIP and size are you looking at? I can get you a delivered-cash number. 870-323-2593`,
  },
  {
    id: "proposal-attached",
    name: "Proposal attached — form lead",
    when: "Official PDF is going out. You have not really talked yet. Gary / George style.",
    subject: "Your all inclusive proposal from CBShippingSolutions",
    body: `Good Evening,

{{firstName}} thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}. Please see our official proposal attached below.

${IF_Q}

${SIGN}`,
  },
  {
    id: "proposal-after-call",
    name: "Proposal attached — after we talked",
    when: "You already spoke. As promised, the PDF. Buddy style.",
    subject: "Your all inclusive proposal from CBShippingSolutions",
    body: `Good Evening,

{{firstName}} thanks for reaching out to us at CBShippingSolutions. I enjoyed our conversation{{noteClause}}. As promised please see our official proposal attached below.

${IF_Q}

${SIGN}`,
  },
  {
    id: "proposal-after-call-short",
    name: "Proposal after the call — short",
    when: "You talked today. Short cover. Bernardo style. Attach the PDF.",
    subject: "Proposal from CBSS",
    body: `{{firstName}},

Thanks for taking the time to talk to me today. Please see the attached document below verifying everything we discussed regarding the containers. We look forward to working with you on this.

${SIGN}`,
  },
  {
    id: "proposal-commercial",
    name: "Commercial proposal after the call",
    when: "They talked on the phone. Bigger job. Trevor / Charles style. Attach the PDF. No new price.",
    subject: "Your all inclusive proposal from CBShippingSolutions",
    body: `{{firstName}},

as discussed prior on the phone here is your official proposal from us here at CBShippingSolutions. This proposal covers the scope of the project and the cost of the units with delivery.{{priceClause}}

I look forward to getting this moving with you.

${SIGN}`,
  },
  {
    id: "need-zip",
    name: "Need two details",
    when: "They replied. You still need ZIP, grade, site, or destination before you lock it.",
    subject: "Quick question so I can lock your container",
    body: `Hi {{firstName}},

Thanks for reaching out to us at CBShippingSolutions.{{priceClause}}

Before we finalize everything, could you clarify two quick details for us?

Delivery ZIP / final destination
New or used, and the size you want{{siteClause}}

Once you let me know, I will get everything set up for you.

${SIGN}`,
  },
  {
    id: "follow-up-quiet",
    name: "2nd / 3rd — they went quiet",
    when: "You already sent a quote or proposal. They have not written back. Still early. Not the old-lead reconnect.",
    subject: "Checking in from CBShippingSolutions",
    body: `Good Morning{{happyDay}}!

{{firstName}} just checking in from CBShippingSolutions. I still have your request{{whatClause}}{{zipClause}}.

If you want to move, reply here or call me at (870)-323-2593. If the timing changed, that is fine too.

${SIGN}`,
  },
  {
    id: "they-will-review",
    name: "They said they will review",
    when: "They wrote they got it and will look it over. Stay human. Offer a meet. Do not push.",
    subject: "Re: Your all inclusive proposal from CBShippingSolutions",
    body: `{{firstName}} look forward to hearing from you. Would it be beneficial if we hop on a quick call to walk the options, or would you rather just reply when you are ready?

${SIGN}`,
  },
  {
    id: "got-reply-shopping",
    name: "They are comparing quotes",
    when: "They got the proposal and said they added it to a spreadsheet / will be in touch.",
    subject: "Re: Your all inclusive proposal from CBShippingSolutions",
    body: `Good Morning,

{{firstName}} thanks for the note. Glad the proposal landed. No rush on our side. When you are ready to lock it in, reply here or call (870)-323-2593.

${SIGN}`,
  },
  {
    id: "late-reconnect",
    name: "4th / old lead — still interested?",
    when: "The file went cold. This is a reconnect, not a first email. Chris uses Hey, not Good Morning.",
    subject: "Are you still interested in a shipping container?",
    body: `Hey,

Christopher Banks here owner of CBShippingSolutions.

Reconnecting on the container project you were looking at{{whatClause}}{{zipClause}}.

I know how these projects go—sometimes budgets shift, local permits get annoying, or timing just gets pushed back.

If you're still needing a box delivered, let me know and I can give you an updated quote. If you ended up going another route or built a wooden shed instead, no hard feelings at all—just let me know so I stop bothering you!

${SIGN}`,
  },
  {
    id: "resend-proposal",
    name: "4th — put the proposal back in front of them",
    when: "You already sent the packet weeks ago. Resend the same PDF. Do not write a new pitch.",
    subject: "Your all inclusive proposal from CBShippingSolutions",
    body: `{{firstName}},

Wanted to make sure this was still in front of you. Please see our official proposal attached below.

${IF_Q}

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

${IF_Q}

${SIGN}`,
  },
  {
    id: "ready-to-lock",
    name: "Ready to lock",
    when: "They said yes. Confirm next step. Do not invent a new price.",
    subject: "Let’s lock your container",
    body: `Good Morning,

{{firstName}} glad we are moving. Reply with the delivery address and the best phone for the driver.{{priceClause}}

Home drops are paid before the truck. I will confirm the weekday window as soon as we have the site.

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

function happyDay(day: string): string {
  const d = String(day || "").trim();
  if (!d) return "";
  return ` and Happy ${d}`;
}

function dayClause(day: string): string {
  const d = String(day || "").trim();
  return d ? `, ${d},` : "";
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
  const day = String(vars.day || "").trim();
  const note = String(vars.note || "").trim();
  const fill = (s: string) =>
    s
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{happyDay\}\}/g, happyDay(day))
      .replace(/\{\{dayClause\}\}/g, dayClause(day))
      .replace(/\{\{whatClause\}\}/g, clause(" for ", what))
      .replace(/\{\{zipClause\}\}/g, clause(" for zip ", zip))
      .replace(/\{\{priceClause\}\}/g, price ? ` The delivered cash figure we quoted is ${price}.` : "")
      .replace(/\{\{siteClause\}\}/g, clause(" — ", site))
      .replace(/\{\{noteClause\}\}/g, note ? ` and look forward to ${note}` : " and look forward to working with you")
      .replace(/\{\{what\}\}/g, what || "a container")
      .replace(/\{\{zip\}\}/g, zip)
      .replace(/\{\{price\}\}/g, price)
      .replace(/\{\{day\}\}/g, day)
      .replace(/\{\{note\}\}/g, note);
  return { id: t.id, name: t.name, subject: fill(t.subject), body: fill(t.body).replace(/\n{3,}/g, "\n\n") };
}
