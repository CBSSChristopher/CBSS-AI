export type TemplateVars = {
  firstName?: string;
  what?: string;
  zip?: string;
  price?: string;
  site?: string;
  day?: string;
  note?: string;
};

export type TemplateField = keyof TemplateVars;

export type EmailTemplate = {
  id: string;
  name: string;
  when: string;
  group: string;
  subject: string;
  body: string;
  fields: TemplateField[];
};

const GROUP_CTE = "If they missed you — CTE emails";
const GROUP_FORM = "They just filled the form";
const GROUP_PROPOSAL = "Sending a proposal";
const GROUP_REPLIED = "They wrote back";

const SIGN =
  "With thanks and my blessings!\nChristopher Banks\nPresident/Owner\nDirect Business Line: (870)-682-3867\nPersonal Phone: (870)-323-2593\nWebsite: Https://cbshippingsolutions.com/";
const IF_Q =
  "IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.";

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "cte-email",
    name: "CTE1 — first email if they missed",
    when: "You already called and texted. They did not pick up. This is the first CTE email.",
    group: GROUP_CTE,
    subject: "Your shipping container needs",
    fields: ["firstName"],
    body: `Hey {{firstName}}!

I tried reaching out by phone and text recently regarding your shipping container needs, but I might have caught you at a busy time.

As the Owner of CBShippingSolutions, I just wanted to follow up. We keep the process of buying a container clear and straightforward so you get what you need without surprises.

If you are still exploring options, reply here or call or text me at (870)-323-2593 and I will set aside a few minutes.

${SIGN}`,
  },
  {
    id: "follow-up-quiet",
    name: "CTE2 — email 2",
    when: "CTE1 already went out. They still have not answered. Second email, still early.",
    group: GROUP_CTE,
    subject: "Checking in from CBShippingSolutions",
    fields: ["firstName", "what", "zip", "day"],
    body: `Good Morning{{happyDay}}!

{{firstName}} just checking in from CBShippingSolutions. I still have your request{{whatClause}}{{zipClause}}.

If you want to move, reply here or call me at (870)-323-2593. If the timing changed, that is fine too.

${SIGN}`,
  },
  {
    id: "cte3-email",
    name: "CTE3 — email 3",
    when: "CTE1 and CTE2 already went out. They still have not answered. Third email.",
    group: GROUP_CTE,
    subject: "Checking in from CBShippingSolutions",
    fields: ["firstName", "what", "zip", "day"],
    body: `Good Morning{{happyDay}}!

{{firstName}} circling back one more time on your container{{whatClause}}{{zipClause}}.

If this is still on your list, reply here or call (870)-323-2593 and I will get you a number. If you already went another direction, just say so and I will close the file.

${SIGN}`,
  },
  {
    id: "late-reconnect",
    name: "CTE4 — email 4 if they still don't answer",
    when: "Three emails already went out and the file went cold. This is the last reconnect, not a first email.",
    group: GROUP_CTE,
    subject: "Are you still interested in a shipping container?",
    fields: ["firstName", "what", "zip"],
    body: `Hey,

Christopher Banks here owner of CBShippingSolutions.

Reconnecting on the container project you were looking at{{whatClause}}{{zipClause}}.

I know how these projects go—sometimes budgets shift, local permits get annoying, or timing just gets pushed back.

If you're still needing a box delivered, let me know and I can give you an updated quote. If you ended up going another route or built a wooden shed instead, no hard feelings at all—just let me know so I stop bothering you!

${SIGN}`,
  },
  {
    id: "cte-text",
    name: "CTE text — after the missed call",
    when: "Short text after the first call did not connect. Not an email. Send this before CTE1.",
    group: GROUP_CTE,
    subject: "",
    fields: ["firstName", "zip"],
    body: `Hey {{firstName}} — Christopher with CBShippingSolutions. I tried you earlier about a container{{zipClause}}. What ZIP and size are you looking at? I can get you a delivered-cash number. 870-323-2593`,
  },
  {
    id: "first-reply",
    name: "Form lead — I will call today",
    when: "They just filled the form. You have not missed them yet. Email first, then call the same day. No PDF yet.",
    group: GROUP_FORM,
    subject: "Your quote request from CBShippingSolutions",
    fields: ["firstName", "what", "zip", "day"],
    body: `Good Morning{{happyDay}}!

{{firstName}}, thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}.

I will give you a call today{{dayClause}} to go over options and get you a number. If you need me before then, my direct line is (870)-682-3867.

${SIGN}`,
  },
  {
    id: "proposal-attached",
    name: "Proposal attached — have not talked yet",
    when: "Official PDF is going out. Form lead. You have not really talked yet. Gary / George style.",
    group: GROUP_PROPOSAL,
    subject: "Your all inclusive proposal from CBShippingSolutions",
    fields: ["firstName", "what", "zip"],
    body: `Good Evening,

{{firstName}} thanks for reaching out to us at CBShippingSolutions. I received your request{{whatClause}}{{zipClause}}. Please see our official proposal attached below.

${IF_Q}

${SIGN}`,
  },
  {
    id: "proposal-after-call",
    name: "Proposal attached — after we talked",
    when: "You already spoke. Attach the same official PDF. As promised.",
    group: GROUP_PROPOSAL,
    subject: "Your all inclusive proposal from CBShippingSolutions",
    fields: ["firstName", "note"],
    body: `Good Evening,

{{firstName}} thanks for reaching out to us at CBShippingSolutions. I enjoyed our conversation{{noteClause}}. As promised please see our official proposal attached below.

${IF_Q}

${SIGN}`,
  },
  {
    id: "proposal-after-call-short",
    name: "Proposal after the call — short",
    when: "You talked today. Short cover letter. Attach the PDF.",
    group: GROUP_PROPOSAL,
    subject: "Proposal from CBSS",
    fields: ["firstName"],
    body: `{{firstName}},

Thanks for taking the time to talk to me today. Please see the attached document below verifying everything we discussed regarding the containers. We look forward to working with you on this.

${SIGN}`,
  },
  {
    id: "proposal-commercial",
    name: "Commercial proposal after the call",
    when: "Bigger / commercial job after a call. Attach the PDF. Do not invent a new price.",
    group: GROUP_PROPOSAL,
    subject: "Your all inclusive proposal from CBShippingSolutions",
    fields: ["firstName", "price"],
    body: `{{firstName}},

as discussed prior on the phone here is your official proposal from us here at CBShippingSolutions. This proposal covers the scope of the project and the cost of the units with delivery.{{priceClause}}

I look forward to getting this moving with you.

${SIGN}`,
  },
  {
    id: "need-zip",
    name: "Need two details",
    when: "They wrote back, but you still need ZIP, grade, site, or destination before you can lock it.",
    group: GROUP_REPLIED,
    subject: "Quick question so I can lock your container",
    fields: ["firstName", "price", "site"],
    body: `Hi {{firstName}},

Thanks for reaching out to us at CBShippingSolutions.{{priceClause}}

Before we finalize everything, could you clarify two quick details for us?

Delivery ZIP / final destination
New or used, and the size you want{{siteClause}}

Once you let me know, I will get everything set up for you.

${SIGN}`,
  },
  {
    id: "they-will-review",
    name: "They said they will review",
    when: "They got the proposal and said they will look it over. Stay human. Do not push.",
    group: GROUP_REPLIED,
    subject: "Re: Your all inclusive proposal from CBShippingSolutions",
    fields: ["firstName"],
    body: `{{firstName}} look forward to hearing from you. Would it be beneficial if we hop on a quick call to walk the options, or would you rather just reply when you are ready?

${SIGN}`,
  },
  {
    id: "got-reply-shopping",
    name: "They are comparing quotes",
    when: "They got the proposal and said they added it to a spreadsheet / will be in touch. No rush.",
    group: GROUP_REPLIED,
    subject: "Re: Your all inclusive proposal from CBShippingSolutions",
    fields: ["firstName"],
    body: `Good Morning,

{{firstName}} thanks for the note. Glad the proposal landed. No rush on our side. When you are ready to lock it in, reply here or call (870)-323-2593.

${SIGN}`,
  },
  {
    id: "resend-proposal",
    name: "Resend the same proposal",
    when: "You already sent the packet. Put that same PDF back in front of them. Do not write a new pitch.",
    group: GROUP_PROPOSAL,
    subject: "Your all inclusive proposal from CBShippingSolutions",
    fields: ["firstName"],
    body: `{{firstName}},

Wanted to make sure this was still in front of you. Please see our official proposal attached below.

${IF_Q}

${SIGN}`,
  },
  {
    id: "cash-before-truck",
    name: "Home delivery — cash before the truck",
    when: "Residential drop. Confirm they pay before the truck is dispatched. No COD.",
    group: GROUP_REPLIED,
    subject: "How delivery works with CBShippingSolutions",
    fields: ["firstName"],
    body: `Good Morning,

{{firstName}} thanks for working with CBShippingSolutions. For a home drop, the delivered cash is due before the truck is dispatched. We do not collect on delivery.

Once payment is in, we schedule the weekday drop to a truck-accessible site.

${IF_Q}

${SIGN}`,
  },
  {
    id: "ready-to-lock",
    name: "Ready to lock",
    when: "They said yes. Confirm address and phone for the driver. Do not invent a new price.",
    group: GROUP_REPLIED,
    subject: "Let’s lock your container",
    fields: ["firstName", "price"],
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
  return d ? ` and Happy ${d}` : "";
}

function dayClause(day: string): string {
  const d = String(day || "").trim();
  return d ? `, ${d},` : "";
}

export function listTemplates(): Array<{
  id: string;
  name: string;
  when: string;
  group: string;
  subject: string;
  fields: TemplateField[];
}> {
  return EMAIL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    when: t.when,
    group: t.group,
    subject: t.subject,
    fields: t.fields,
  }));
}

export function renderTemplate(id: string, vars: TemplateVars = {}): {
  id: string;
  name: string;
  subject: string;
  body: string;
} | null {
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
