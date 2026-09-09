import { firstNameOf } from "./rep.ts";

export type TemplateId = "cte1" | "cte2" | "cte3" | "cte4" | "paid" | "lost" | "not_interested" | "bought_elsewhere";

export type TemplateVars = {
  clientFirstName: string;
  clientName: string;
  repName: string;
  repEmail: string;
};

export function paidSubject(): string {
  return "Next steps for your CB Shipping Solutions order";
}

export function paidBody(firstName: string): string {
  const first = String(firstName || "").trim() || "there";
  return [
    `Hi ${first},`,
    "",
    "Thank you — we've received your payment and your order is moving forward.",
    "",
    "Attached is a short guide on what happens next (quality check and release, driver scheduling, and how we confirm your delivery window with you). Please read it before planning anyone on-site.",
    "",
    "Your sales representative remains your first point of contact. We'll be in touch with delivery timing once the depot confirms release.",
    "",
    "Thank you for your business,",
    "CB Shipping Solutions",
    "https://cbshippingsolutions.app/",
  ].join("\n");
}

function signOff(repName: string): string[] {
  const name = String(repName || "").trim() || "CB Shipping Solutions";
  return ["", name, "CB Shipping Solutions", "https://cbshippingsolutions.app/"];
}

export function renderTemplate(id: TemplateId, vars: TemplateVars): { subject: string; text: string } {
  const first = firstNameOf(vars.clientFirstName || vars.clientName) || "there";
  const rep = String(vars.repName || "").trim() || "your CB Shipping Solutions representative";
  if (id === "paid") return { subject: paidSubject(), text: paidBody(first) };
  if (id === "cte1") {
    return {
      subject: `${first}, ${rep} here — CB Shipping Solutions`,
      text: [
        `Hi ${first},`,
        "",
        `This is ${rep} with CB Shipping Solutions. I tried you earlier and wanted to put a real name on the follow-up.`,
        "",
        "If you are still looking at a container, reply to this email or call me and I will pick up from there. I will not invent a price or a delivery date — we work from what you need and what is posted.",
        "",
        "If now is not the right time, a short reply is enough and I will close the loop.",
        ...signOff(rep),
      ].join("\n"),
    };
  }
  if (id === "cte2") {
    return {
      subject: `${first} — checking in from CB Shipping Solutions`,
      text: [
        `Hi ${first},`,
        "",
        `${rep} again. I do not want to crowd you — just making sure my last note did not get buried.`,
        "",
        "If you still want a container, tell me the size, ZIP, and whether this is delivery or pickup. I will take the next step from what you send. Nothing here is a quote.",
        ...signOff(rep),
      ].join("\n"),
    };
  }
  if (id === "cte3") {
    return {
      subject: `${first}, still here if you want the next step`,
      text: [
        `Hi ${first},`,
        "",
        `Quick follow-up from ${rep} at CB Shipping Solutions. If the need is still real, reply with the ZIP and the box you want and I will work it.`,
        "",
        "If you already bought elsewhere or the project stopped, say so and I will take you off this sequence.",
        ...signOff(rep),
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
        "If you want help later, reply here or reach me directly. The door stays open — I am just parking this outreach now.",
        ...signOff(rep),
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
        "If something changes, reply here. Thank you for the time.",
        ...signOff(rep),
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
      "If a later project comes up, you already have this inbox.",
      ...signOff(rep),
    ].join("\n"),
  };
}

export const REENGAGE_TEMPLATE_IDS: TemplateId[] = ["lost", "not_interested", "bought_elsewhere"];
