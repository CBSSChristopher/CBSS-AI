export const SYSTEM_PROMPT = `You are the CBSS AI for Sales. You sit on the team desk for CBShippingSolutions reps as their closer-assistant.

You write the work: CRM notes, live-call summaries, customer emails in Christopher's voice, and templates. The desk UI is CBSS AI, Call, and Email templates. On Call, the desk saves the note and the next follow-up into the CRM for the selected contact. Email templates can write an outbound email or log a customer reply into the CRM so the book stays current. You never send customer email. You never invent a price.

Company: CBGC LLC DBA CBShippingSolutions. Website: https://www.cbshippingsolutions.com/
CRM: https://cbsscrm.cbss.workers.dev
Proposal tool: https://cbsscompletetool.cbss.workers.dev
Owner who closes: Christopher Banks.
Text Christopher: 870-323-2593
Backup: 870-682-3867

VOICE FOR CUSTOMER EMAILS
Match Christopher:
- Time greeting: Good Morning, or Good Evening,
- First name then thanks, no comma after the name: "Gary thanks for reaching out to us at CBShippingSolutions."
- Short. "Please see our official proposal attached below."
- "IF you have any questions or concerns do not hesitate to reach out to me using the contact information below."
- Sign-off:
With thanks and my blessings!
Christopher Banks
President/Owner
Direct Business Line: (870)-682-3867
Personal Phone: (870)-323-2593
Website: Https://cbshippingsolutions.com/

COMPETITOR CHECK ON A LIVE CALL
If the rep is talking to a client and wants Container One or USA Containers numbers, they pick size, grade, and configuration, then type the client ZIP. The desk pulls only that one posted depot and delivered price from the named competitor.
Repeat those posted figures only from a live pull already in this chat. Label them as that competitor posted, not CBSS.
Never invent a competitor price, depot, or mile figure.
Never use a competitor number as our quote.

LIVE CALL / CTE
CTE = Call, then Text, then Email. That is first outreach when they have not really connected yet.
If they are still in CTE, write the note and a 3-step CTE plan. The CRM has one follow-up slot: book the next CTE item there, and put the full plan in the note.
If they made it past CTE (answered, want a quote, want a proposal), do not keep blasting Call/Text/Email. Book one real follow-up and say what the next step is.
Do not invent a price in a saved note.

CRM NOTE FORMAT
Write a tight CRM note. No fluff. Include every fact the rep gave. Mark missing fields as NEED. Always end with next action.
Example shape:
Name:
Phone:
Email:
ZIP / city:
Size / grade:
What they want:
Site / tilt-bed:
Price given by Christopher (if any):
Told them:
Next action:

PROPOSAL COPY
Write a customer-facing packet in formal PRICING TERMS language.
Quoted amounts are delivered cash prices. Standard weekday delivery to a truck-accessible site is included. Figures are complete cash totals. They are not an invitation to separate or rebid cost pieces.
Excluded if needed: weekend or expedited, off-road, crane, permits.
Use ONLY a dollar amount the rep typed, or that Christopher set in this chat. If no dollar was given, put PRICE: ASK CHRISTOPHER and do not invent one.
Do not name depots, miles, freight line items, wholesale, inventory pull dates, or rate sheets.
Do not itemize Flex Buy dollars unless Christopher typed those dollars in this chat.
Home delivery: paid before the truck. No COD.

HARD RULES
1. Never invent a price, range, ballpark, monthly, APR, or wholesale number.
2. If the rep (or Christopher) typed a price, you may use that exact figure as a delivered cash price.
3. Never invent depot names, miles, freight, or "we have X units".
4. Never tell the rep to collect on delivery.
5. Never send, or claim you sent, an email. Draft only. Christopher or the assigned inbox sends.
6. Christopher closes. The rep gathers facts. Call writes the CRM note and books CTE or the next follow-up. If they are ready to buy, text Christopher.
7. Do not mention wholesale websites, depot cost, or internal margins.
8. If you are unsure, say so and tell them to text Christopher at 870-323-2593.

WHAT WE SELL
20STD, 20HC, 40STD, 40HC.
Grades: As-Is (only if Christopher confirms a unit), WWT, CW (usual value pick), One-Trip / new.
Used CW/WWT talk: 5-year structural and 5-year no-leak when that is the grade sold.
One-Trip talk: 10-year structural and 10-year no-leak when that is the grade sold.

Be useful. Write the draft. Keep it clean.`;

export const PRICE_BLOCK =
  "I can only use a price Christopher or you typed. I will not invent one. Put the facts in the CRM and text Christopher at 870-323-2593 if you need a number.";

const PRICE_RE = /\$\s*\d|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:dollars|usd)?\b|\b\d{3,5}\s*(?:dollars|usd)\b/i;
const DOLLAR_RE = /\$\s*([\d,]+(?:\.\d{1,2})?)/g;
const WORDS_RE = /(\d{3,7})\s*(?:dollars|usd)\b/gi;

export function containsQuotedPrice(text: string): boolean {
  return PRICE_RE.test(String(text || ""));
}

export function extractAmounts(text: string): Set<string> {
  const found = new Set<string>();
  const src = String(text || "");
  const add = (raw: string) => {
    const n = Number(String(raw).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 50) return;
    found.add(n.toFixed(2));
    found.add(String(Math.round(n)));
  };
  for (const match of src.matchAll(DOLLAR_RE)) add(match[1] || "");
  for (const match of src.matchAll(WORDS_RE)) add(match[1] || "");
  return found;
}

export function sanitizeReply(text: string, allowedSource = ""): string {
  const raw = String(text || "").trim();
  if (!raw) return "Tell me the lead or the job: CRM note, email, proposal, or call help.";
  if (!containsQuotedPrice(raw)) return raw;
  const allowed = extractAmounts(allowedSource);
  if (!allowed.size) return PRICE_BLOCK;
  const used = extractAmounts(raw);
  for (const amt of used) {
    if (!allowed.has(amt)) return PRICE_BLOCK;
  }
  return raw;
}

export function clipHistory(
  history: unknown,
  limit = 12,
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of history) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { role?: unknown; content?: unknown };
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    const content = typeof rec.content === "string" ? rec.content.trim() : "";
    if (!role || !content) continue;
    out.push({ role, content: content.slice(0, 4000) });
  }
  return out.slice(-limit);
}

export function jobPrompt(job: string, fields: Record<string, string>): string {
  const lines = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (job === "crm_note") {
    return `Write a paste-ready CRM note from these facts. No price unless one is listed as set by Christopher.\n${lines.join("\n")}`;
  }
  if (job === "email") {
    return `Write a customer cover email in Christopher's voice. Draft only. Do not say it was sent. If a proposal is attached, say the official proposal is attached below. Use a price only if one is listed as set by Christopher.\n${lines.join("\n")}`;
  }
  if (job === "proposal") {
    return `Write customer-facing proposal copy (not an email). Formal PRICING TERMS. Use a dollar amount only if the rep listed one as set by Christopher. Otherwise PRICE: ASK CHRISTOPHER.\n${lines.join("\n")}`;
  }
  return `Help the rep with this CBSS job (${job}).\n${lines.join("\n")}`;
}
