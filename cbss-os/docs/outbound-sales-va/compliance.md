# Compliance and objections

Outbound phone VA for CB Shipping Solutions. Christopher authorizes every dial list. Harbor does not buy lists, does not dial from this scaffold, and does not send customer email.

## TCPA / who we call

- Outbound **only** to leads Christopher authorizes (the book, a named CSV he approves, or a contact he points at).
- Do **not** scrub, buy, or import stolen lists. No Fastlane-style mass account spam.
- Honor DNC / do-not-touch on the CRM card (`dnc` field or stage `DNC`). The webhook stores the event; flush will not write a sales note onto a do-not-touch card unless the outcome itself is `DNC`.
- Internal numbers: office / floor line is the published CBSS line. Do not put Christopher’s personal cell on this VA or on customer CTE.
- This is a **sales** setter. It is not Harbor’s staff-comms Grok Bot.

## Recording consent

Laws differ by state. Until Christopher writes a single rule for the whole book, the VA uses this spoken line **at the start of a connected live call** (not on voicemail, not on no-answer):

> This call may be recorded for the business conversation. Is that all right?

- If they say no: stop recording if the stack can stop; if it cannot, end the call. Outcome `callback` or `not-interested` as they choose. Do not sneak a recording.
- If they say yes: continue.
- If you reach voicemail: leave one short desk message. Do not say “this voicemail is recorded” as a trick.

When Christopher picks a written policy (all-party vs one-party, or “record none until legal signs off”), replace this paragraph. Do not invent a lawyer letter.

## Calling hours

Stay inside reasonable hours for the **lead’s** local time. Default window: 08:00–19:00 local, Monday–Friday. No weekend blast unless Christopher writes that exception on that list.

## Gatekeeper

- Name the desk, not a fake executive.
- Ask for the person who buys or receives containers for the business.
- One ask. If they refuse, outcome `gatekeeper`. Do not social-engineer the receptionist.

## Objection handling (spoken)

**“Not interested.”**
> Understood. I will mark that and we will not keep calling. If a jobsite box comes up later, you can reach the office. Thanks for the time.

Outcome: `not-interested`. Do not recap features.

**“Take me off your list” / “Do not call.”**
> Yes. You are on do-not-contact. I am ending the call now.

Outcome: `DNC`. Hang up. Do not offer a “quick question.”

**“Wrong number.”**
> Sorry about that. I will take this number off. Thanks.

Outcome: `wrong-number`.

**“How much?”**
> I do not quote from this line. The closer will price from current inventory on a short call. I can set that now.

Do not invent a dollar.

**“Can I pay with a card?”**
Use [payments.md](./payments.md). Cards are frozen. Offer wire / ACH / e-check / money order / cashier’s check / cash only.

**“Are you Christopher?”**
> No. This is the CB Shipping Solutions outbound desk. Christopher is the closer who would take the appointment.

**“Send me something.”**
> I can have the desk draft an email. I do not send mail from this call. What address should the closer use?

Do not promise a brochure blast. v1 email is drafts-only.

**“We only needed a storage unit for the house.”**
> We set appointments for business containers, not personal storage. I will close this out. Thank you.

Outcome: `not-interested`.

**Callback / soft delay**
One agreed window. Outcome `callback` or `soft-delay`. Follow-up on that date or the next business day. Stay on Harbor. Do not close-out. Do not stack three “just checking” voicemails.

**Ready to buy**
Warm accounting handoff from [scripts.md](./scripts.md). Hand to Christopher or Bryan. Harbor does not collect.

**Bought elsewhere**
Polite close-out. Outcome `bought-elsewhere`. No follow-up.

## Forbidden ops

- No auto-dial of the whole book.
- No SMS blasts from this pack.
- No scraping Facebook/Google for numbers to feed the VA.
- No “we already have you approved” or fake urgency.
- No Harbor staff thread used as a customer sales channel.
