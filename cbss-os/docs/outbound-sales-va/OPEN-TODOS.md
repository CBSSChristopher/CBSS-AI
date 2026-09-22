# OPEN-TODOS — Christopher

Harbor scaffolded the pack. Live accounts stay in your hands. Harbor will not spend money, buy Twilio / ElevenLabs, dial anyone, or send customer email.

1. **Create the ElevenLabs account** and a Conversational agent. Paste the system prompt from `persona.md` plus ready-to-buy variants from `scripts.md`.
2. **Pick a neutral professional voice.** Do not clone Christopher without a written decision in this repo or mail.
3. **Buy a Voice-only Twilio number** (Console → Buy a number → enable Voice; leave SMS/Messaging off). No A2P. Inventory digits may differ from any preferred number unless you port. That number is the Harbor DID. Paste `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. See `twilio.md`.
4. **Import the same Voice number** into the ElevenLabs Conversational Agent for inbound (they call Harbor). See `inbound.md`. Never put `(870) 323-2593` on customer CTE / VM. Do not attach SMS.
5. **Paste secrets** on the `cbssos` Worker (`VA_WEBHOOK_SECRET`, `ELEVENLABS_*`, Twilio). Never commit them.
6. **Export a real Meta Lead Ads CSV** and upload it on The Yard → VA calls (or hand it in chat). Preview first. No test fixtures on New/Unassigned.
7. **Approve Harbor CTE** on that pile. Say go before `VA_ENABLED` / `VA_DIAL_ARMED`. No Meta webhook to configure.

Until those taps happen, `/va/dial` stays parked, `/va/sms` stays 403, and email stays drafts-only. Harbor does not text leads.
