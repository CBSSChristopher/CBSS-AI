# Twilio Harbor DID — Voice only

Harbor outreach is **call + email**. Harbor does **not** text leads. Christopher can buy a Voice-only number today without SMS / A2P 10DLC friction.

## Buy Number (today)

1. Twilio Console → Phone Numbers → **Buy a number**.
2. Enable **Voice**. Leave **SMS / Messaging off** (optional if the inventory row has it; Harbor will not use it).
3. Do **not** register A2P, Messaging Service, or campaign for this Harbor DID.
4. Digits in inventory may differ from any preferred number unless you **port**. That is fine — paste whatever Voice number you buy as `TWILIO_PHONE_NUMBER`.
5. Import that number into the ElevenLabs Conversational Agent for **Voice** inbound (they call Harbor).
6. Point Twilio **Voice** webhook at the ElevenLabs agent. No Messaging webhook.

Harbor never requires Messaging capability on the Twilio number.

Callback on voicemail and CTE is this Harbor DID. Never Christopher’s personal cell `(870) 323-2593`.

See [inbound.md](./inbound.md). `VA_DIAL_ARMED` stays `false` until Christopher says go.
