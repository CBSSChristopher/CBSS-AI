# Daily call-out SOP (unified Harbor desk)

Harbor runs this as **one** daily operation — Yard queue + voice sales. Dial stays **parked** until Christopher says **arm**; until then Harbor prepares the book, notes, and drafts only.

## Hard locks (every day)

- Channels: **call + email only** — never SMS  
- Harbor DID / voicemail callback: **870-380-4010** only  
- Christopher cell **870-323-2593**: human handoff only — **never** on voicemail  
- Cards frozen; Harbor never collects payment  
- Closers: **Christopher Banks** (default) or **Bryan Reese**  
- Residential **and** business containers — do not refuse personal / backyard / home storage  
- Facebook form calls use the coach locks in [01-system-prompt.md](./01-system-prompt.md) and [16-new-hire-call-sheet.md](./16-new-hire-call-sheet.md). Tool dollars only. No competitor names.  
- No live customer dials unless Christopher said **arm** today  

## Morning open (before first dial)

1. **Health glance** — Yard login up; note any outage from overnight health checks.  
2. **Ingest** — Import new Meta/FB CSV leads → stage **New / Unassigned** (no Meta webhook). Map phones/emails; skip DNC.  
3. **Build today’s book** — `get_next_lead`: due follow-ups on Harbor-assigned leads first, then New/Unassigned. New/Unassigned is the global pile. Due follow-ups are Harbor-owner only (not every sales rep's Yard cards).  
4. **Prioritize** — Ready-to-buy / hot follow-ups first, then soft delays due, then fresh New/Unassigned, then CTE ladder continues.  
5. **Card check** — Every dial target has a complete [lead card](./10-lead-card-spec.md). Fix gaps before calling.  
6. **Arm gate** — If Christopher has not said **arm**, stop at prep: queue list + email drafts only. If he has, proceed to call block.

## Call block (only if armed)

For each card, in order:

1. Open lead card + last notes.  
2. Place call as **Harbor** from **870-380-4010**.  
3. Disposition immediately (see labels below).  
4. Write the note **before** the next dial.  
5. If ready-to-buy → cheesy accounting handoff → park on Christopher (default) or Bryan → full quote note. **Do not collect payment.**

### Disposition labels

| Label | Meaning | Next |
| --- | --- | --- |
| no-answer | Rang out | CTE step +1 or schedule next CTE; optional VM |
| voicemail | Left VM | Callback = 870-380-4010 only; advance CTE |
| answered | Live talk | Qualify; note; set follow-up or handoff |
| soft-delay | Spouse / later / send info | Stay in queue; dated follow-up |
| ready-to-buy | Wants to purchase | Handoff Christopher/Bryan; cards frozen note |
| hard-no | Not interested / DNC / wrong # / bought elsewhere | Close-out; no follow-up |
| inbound-* | They called Harbor DID | Same qualify rules |

### Voicemail (every time)

Christopher-style warmth. First name + container from card. Callback **(870) 380-4010** only.

## Midday / afternoon

1. Process inbound Harbor DID callbacks same as outbound qualify.  
2. Send **email** follow-ups only (no SMS) for soft-delays that asked for info — draft under dual-review spirit if required.  
3. Refresh follow-up book; move completed CTE steps.  
4. Invoice/money tools are **closer/accounting** lane after handoff — Harbor does not take cards.

## End of day

1. Zero un-noted dials.  
2. Tomorrow’s soft-delay list dated.  
3. New/Unassigned not left orphaned without a next step.  
4. Confirm dial arm back to **parked** unless Christopher left standing arm (default = park).  
5. Short desk note: calls made, handoffs, blockers.

## CTE ladder (from Yard history)

Used when no live close yet:

- **CTE1** — Intro / first touch. No-answer, voicemail, or soft-delay sends the CTE1 template live through AgentMail, same `fireTemplate` path as any Yard rep.  
- **CTE2** — Follow-up (~+1 business day). Sends live when that step is logged or comes due.  
- **CTE3** — Value / objection pass. Same live send when logged or due.  
- **CTE4** — Final nudge / break-up tone. Same live send when logged or due.  

Harbor CTE mail: From = AgentMail inbox. Reply-To = Harbor (`harbor@cbshippingsolutions.com`). To = the lead’s email. Ladder offsets and template copy stay the Yard ladder. Dial stays parked unless `VA_DIAL_ARMED`. No SMS. Ready-to-buy still notifies Christopher Banks and Bryan Reese only. Paid / Next Steps CC rules are unchanged. If AgentMail is not configured, the send fails closed.

Templates are the Yard CTE templates (not a Harbor-only copy). Harbor personalizes with the assigned-rep footer. Never invent a price.

## What Harbor does not do in the daily

- SMS/text  
- Collect payment or card data  
- Leave Christopher’s cell on VM  
- Dial while unarmed  
- Mix staff-comms Harbor bot with this sales desk  
