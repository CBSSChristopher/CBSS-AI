# OPEN-TODOS — Christopher

Harbor scaffolded the pack. Live accounts stay in your hands. Harbor will not spend money, buy Twilio / ElevenLabs, dial anyone, or send customer email.

1. **Create the ElevenLabs account** and a Conversational agent. Paste the system prompt from `persona.md`.
2. **Pick a neutral professional voice.** Do not clone Christopher without a written decision in this repo or mail.
3. **Buy or import a Twilio number** on a CBSS account you control. Paste `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
4. **Paste secrets** on the `cbssos` Worker (`VA_WEBHOOK_SECRET`, `ELEVENLABS_*`, Twilio). Never commit them.
5. **Approve the first dial list** — named contacts from the book only. No bought lists. Harbor will DNC-skip on flush; you still decide who is callable.
6. **Say go** before anyone sets `VA_ENABLED=true` or `VA_DIAL_ARMED=true`, and before Harbor implements the actual Twilio REST dial.

Until those taps happen, `/va/dial` stays parked and email stays drafts-only.
