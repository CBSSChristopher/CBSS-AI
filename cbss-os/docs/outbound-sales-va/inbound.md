# Harbor inbound (they call back)

Harbor is **not outbound-only**. When a lead calls the Twilio Harbor caller ID, Harbor **answers**.

## What happens

1. Match the inbound CLI to a Yard contact (phone, then email / id).
2. If there is no card, create one (`source inbound_twilio`, owner Harbor, stage Working) and attach the note.
3. Same qualification as outbound.
4. **Solid / ready to close** → spoken accounting handoff → owner Christopher Banks or Bryan Reese, stage **Ready to buy**. Harbor does not collect payment.
5. **Not solid** → Harbor handles: message, note, disposition, stay on Harbor or soft-delay follow-up.

`POST /va/harbor/inbound` writes the outcome. Dial stays parked until `VA_DIAL_ARMED`.

## Twilio / ElevenLabs (Christopher taps later — Harbor does not buy)

Harbor is **Voice + email**. No SMS. See [twilio.md](./twilio.md).

1. Twilio **Buy a number** → enable **Voice**. SMS / Messaging optional and **off**. No A2P.
2. Inventory digits may differ from any preferred number unless you port. Buy what is in stock; paste it as `TWILIO_PHONE_NUMBER`.
3. Import that Voice number into the ElevenLabs Conversational Agent (Twilio **Voice**). Do not attach a Messaging webhook.
4. Point Twilio Voice to the ElevenLabs inbound webhook (or the agent’s Twilio Voice integration).
5. Point the agent post-call webhook at `https://floor.cbshippingsolutions.app/va/hooks/outbound` (HMAC) **and** send Harbor dispositions to `POST /va/harbor/inbound`.
6. Voicemail and CTE leave **that** Harbor DID.

Do **not** put Christopher’s personal cell `(870) 323-2593` on customer CTE or voicemail. That line is for human handoff only.

`POST /va/sms` and `/va/text` stay 403. Messaging capability is not required on the Twilio number.

## Outcomes on inbound

| Slug | Meaning |
| --- | --- |
| `inbound-answered` | They called in. Not solid. Harbor stays Working. |
| `inbound-message` | Message / not ready. Soft delay. Follow-up next business day unless they named a date. |
| `inbound-ready-to-buy` | Ready to buy. Same handoff + full closer note as outbound `ready-to-buy`. |
| `soft-delay` / `callback` | Stay Harbor · Follow-up. |
| Hard nos | `not-interested`, `bought-elsewhere`, `DNC`, `wrong-number` — polite close-out, no follow-up. |

## Soft delay vs hard no

Unchanged from outbound. Soft delay keeps the card on Harbor. Hard no closes the card. See [workflow.md](./workflow.md).
