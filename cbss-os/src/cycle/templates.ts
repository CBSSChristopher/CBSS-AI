import { cleanScheduleUrl, firstNameOf } from "./rep.ts";

export type TemplateId = "cte1" | "cte2" | "cte3" | "cte4" | "paid" | "lost" | "not_interested" | "bought_elsewhere" | "bad_number";

export type TemplateVars = {
  clientFirstName: string;
  clientName: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  repTitle: string;
  /** Assigned-rep Google Appointment / Meet page. Omitted when empty. */
  repScheduleUrl?: string;
};

export function scheduleLines(vars: Pick<TemplateVars, "repScheduleUrl">): string[] {
  const url = cleanScheduleUrl(vars.repScheduleUrl);
  if (!url) return [];
  return ["", "Prefer a Google Meet? Schedule a time with me:", url];
}

export function replyOrMeet(vars: Pick<TemplateVars, "repScheduleUrl">, fallback: string): string {
  return scheduleLines(vars).length
    ? "Reply to this email, call me, or schedule a Google Meet with the link below."
    : fallback;
}

export function paidSubject(): string {
  return "Next steps for your CB Shipping Solutions order";
}

export function paidBody(firstName: string, vars: Pick<TemplateVars, "repScheduleUrl"> = {}): string {
  const first = String(firstName || "").trim() || "there";
  return [
    `Hi ${first},`,
    "",
    "Thank you — we've received your payment and your order is moving forward.",
    "",
    "Attached is a short guide on what happens next (quality check and release, driver scheduling, and how we confirm your delivery window with you). Please read it before planning anyone on-site.",
    "",
    "Your sales representative remains your first point of contact. We'll be in touch with delivery timing once the depot confirms release.",
    ...scheduleLines(vars),
    "",
    "Thank you for your business,",
    "CB Shipping Solutions",
    "https://cbshippingsolutions.app/",
  ].join("\n");
}

export function signOff(vars: Pick<TemplateVars, "repName" | "repEmail" | "repPhone" | "repTitle" | "repScheduleUrl">): string[] {
  const name = String(vars.repName || "").trim() || "CB Shipping Solutions";
  const title = String(vars.repTitle || "").trim();
  const email = String(vars.repEmail || "").trim();
  const phone = String(vars.repPhone || "").trim();
  const lines = ["", name];
  if (title) lines.push(title);
  lines.push("CB Shipping Solutions");
  if (email) lines.push(email);
  if (phone) lines.push(phone);
  lines.push(...scheduleLines(vars));
  lines.push("https://cbshippingsolutions.app/");
  return lines;
}

export function renderTemplate(id: TemplateId, vars: TemplateVars): { subject: string; text: string } {
  const first = firstNameOf(vars.clientFirstName || vars.clientName) || "there";
  const rep = String(vars.repName || "").trim() || "your CB Shipping Solutions representative";
  const close = signOff(vars);
  if (id === "paid") return { subject: paidSubject(), text: paidBody(first, vars) };
  if (id === "cte1") {
    return {
      subject: `${first}, ${rep} here — CB Shipping Solutions`,
      text: [
        `Hi ${first},`,
        "",
        `This is ${rep} with CB Shipping Solutions. I wanted to introduce myself — you asked about a shipping container, and I am the person who will help you with it.`,
        "",
        replyOrMeet(vars, "Reply to this email or call me and I will take it from there."),
        ...close,
      ].join("\n"),
    };
  }
  if (id === "cte2") {
    return {
      subject: `${first} — checking in from CB Shipping Solutions`,
      text: [
        `Hi ${first},`,
        "",
        `${rep} again with CB Shipping Solutions. Just making sure my last note did not get buried.`,
        "",
        replyOrMeet(vars, "If you still want a container, reply here or call me and I will help with the next step."),
        ...close,
      ].join("\n"),
    };
  }
  if (id === "cte3") {
    return {
      subject: `${first}, still here if you want the next step`,
      text: [
        `Hi ${first},`,
        "",
        replyOrMeet(vars, `Quick follow-up from ${rep} at CB Shipping Solutions. If you still need a container, reply or call and I will work it.`),
        "",
        "If you already bought elsewhere or the project stopped, say so and I will take you off this list.",
        ...close,
      ].join("\n"),
    };
  }
  if (id === "cte4") {
    return {
      subject: `${first} — last note from ${rep} at CB Shipping Solutions`,
      text: [
        `Hi ${first},`,
        "",
        "This is my last scheduled follow-up. I will not keep emailing the same thread.",
        "",
        replyOrMeet(vars, "If you want help later, reply here or call me. The door stays open."),
        ...close,
      ].join("\n"),
    };
  }
  if (id === "bad_number") {
    return {
      subject: `${first} — we cannot reach you at the number we have`,
      text: [
        `Hi ${first},`,
        "",
        `This is ${rep} with CB Shipping Solutions. The phone number we have for you is not a working way to reach you, so we do not know how to contact you.`,
        "",
        "If you still want help with a container, reply to this email with a good phone number and the best time to call. If this inbox is wrong too, send the right email address.",
        ...scheduleLines(vars).length ? ["You can also schedule a Google Meet with the link below."] : [],
        ...close,
      ].join("\n"),
    };
  }
  if (id === "lost" || id === "not_interested") {
    return {
      subject: `${first} — we will leave this with you`,
      text: [
        `Hi ${first},`,
        "",
        `Understood. ${rep} at CB Shipping Solutions will not keep this sequence going.`,
        "",
        "If something changes, reply here or call me.",
        ...close,
      ].join("\n"),
    };
  }
  return {
    subject: `${first} — thanks for letting us know`,
    text: [
      `Hi ${first},`,
      "",
      `Thanks for the update. ${rep} will close this file on our side.`,
      "",
      "If a later project comes up, reply here or call me.",
      ...close,
    ].join("\n"),
  };
}

export const REENGAGE_TEMPLATE_IDS: TemplateId[] = ["lost", "not_interested", "bought_elsewhere"];
