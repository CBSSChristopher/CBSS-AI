# Env / config checklist (placeholders only)

Put secrets on the **cbssos** Worker with `wrangler secret put`. Never commit them. Never paste live keys into git, docs, or chat screenshots.

`wrangler.jsonc` already ships public flags only:

```
VA_ENABLED=false
VA_DIAL_ARMED=false
```

## Secrets Christopher pastes (when he is ready)

| Secret | Purpose |
| --- | --- |
| `VA_WEBHOOK_SECRET` | HMAC for `POST /va/hooks/outbound`. Required before any vendor can post. |
| `ELEVENLABS_API_KEY` | Conversational AI. Placeholder until Christopher creates the account. |
| `ELEVENLABS_AGENT_ID` | The setter agent id. |
| `ELEVENLABS_VOICE_ID` | Neutral professional voice. Not a Christopher clone. |
| `TWILIO_ACCOUNT_SID` | Later. Do not buy a number from Harbor. |
| `TWILIO_AUTH_TOKEN` | Later. |
| `TWILIO_PHONE_NUMBER` | E.164 Harbor **Voice** DID (voicemail + inbound callback). SMS / Messaging not required. Never Christopher’s personal cell. |
| `VA_CRM_EMAIL` | Optional service login so the webhook can `appendNote` without a browser session. Also used to pull posted proposal inventory for Harbor ZIP quote. |
| `VA_CRM_PASSWORD` | Optional. Same rule: secret put, never git. |
| `HARBOR_QUOTE_TOKEN` | Shared secret for `POST /va/harbor/quote` and `POST /va/harbor/ready-to-buy`. Header `X-Harbor-Token` or `Authorization: Bearer`. Placeholder until Christopher runs `npx wrangler secret put HARBOR_QUOTE_TOKEN` on `cbssos`. |

Already on the Worker (do not confuse them with this VA):

- `AUTH_SECRET`, `AGENTMAIL_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`

Harbor staff mail is AgentMail / Gmail. This VA does not use those to talk to customers.

## Webhook signature

Header: `X-VA-Signature: sha256=<hex>`

Hex is HMAC-SHA256 of the **raw body**, using `VA_WEBHOOK_SECRET`.

Optional replay window: send `X-VA-Timestamp` as unix seconds. If that header is present, the signed material is `<timestamp>.<raw body>` and stamps older than five minutes fail.

Also accepted header names: `X-Webhook-Signature`, `X-ElevenLabs-Signature`.

## Public vars (safe in wrangler)

| Var | Value |
| --- | --- |
| `VA_ENABLED` | `false` until Christopher says go |
| `VA_DIAL_ARMED` | `false` until the first approved dial list exists |

## Apply steps (no CRM migration)

1. Merge / deploy The Yard **only when Christopher says go**. This PR does not deploy.
2. `npx wrangler secret put VA_WEBHOOK_SECRET` on `cbssos`.
3. Buy a **Voice-only** Twilio number (`twilio.md`). Point ElevenLabs post-call webhook at `https://floor.cbshippingsolutions.app/va/hooks/outbound`. Import the number into the agent for **Voice** inbound (`inbound.md`). Harbor dispositions go to `POST /va/harbor/inbound`. Do not configure SMS.
4. Open The Yard signed in as Christopher → CRM → **VA calls**. Confirm a test capture (no live customer).
5. Click **Write pending to CRM** on a contact that already exists.
6. Leave `VA_DIAL_ARMED=false` until the first list is approved.

There is **no** `wrangler d1` / CRM SQL migration in this pack. CRM worker source is not in this repository. If a first-class `vaCalls` dict is wanted later, that Worker has to land in git first.
