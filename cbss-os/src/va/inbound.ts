import { matchCrmContact, phoneDigits } from "./match.ts";
import { HARBOR_OWNER } from "./workflow.ts";

export const INBOUND_SOURCE = "inbound_twilio";

export function inboundCallerPhone(body: Record<string, unknown> | null | undefined): string {
  const src = body && typeof body === "object" ? body : {};
  return String(src.phone || src.from || src.caller || src.From || src.Caller || "").trim();
}

export function planInboundContact(
  contacts: unknown,
  hint: { contactId?: string; phone?: string; name?: string; company?: string; email?: string },
  now = new Date(),
): {
  contact: Record<string, unknown> | null;
  created: boolean;
  error: string;
} {
  const phone = String(hint.phone || "").trim();
  if (!phoneDigits(phone) && !String(hint.contactId || "").trim()) {
    return { contact: null, created: false, error: "Need the inbound caller ID." };
  }
  const hit = matchCrmContact(contacts, hint);
  if (hit) return { contact: hit, created: false, error: "" };
  if (!phoneDigits(phone)) return { contact: null, created: false, error: "Need the inbound caller ID." };
  return {
    contact: {
      id: now.getTime(),
      name: String(hint.name || "").trim() || "Inbound " + phone,
      phone,
      email: String(hint.email || "").trim(),
      company: String(hint.company || "").trim(),
      owner: HARBOR_OWNER,
      status: "Working",
      source: INBOUND_SOURCE,
      cteStage: "CTE1",
      created: now.toISOString().slice(0, 10),
      nextAction: "Inbound callback — Harbor answered",
    },
    created: true,
    error: "",
  };
}
