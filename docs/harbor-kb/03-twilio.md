# 03 — Twilio

## Locked Harbor DID

| Field | Value |
| --- | --- |
| National | **870-380-4010** |
| E.164 | **+18703804010** |
| Voice | **On** |
| SMS / Messaging | **Off** |
| A2P 10DLC | **Skipped** — not required |

Harbor outreach is **call + email only**. Harbor does not text leads. A Voice-only number is enough.

## What this number is for

- Outbound caller ID (when Christopher says **arm**).
- Inbound: they call Harbor; Harbor answers.
- Voicemail and CTE callback: **870-380-4010** only.

## What this number is not

- Not an SMS / MMS line.
- Not an A2P campaign.
- Not Christopher’s personal cell.

**NEVER** put **870-323-2593** on voicemail, CTE, or ElevenLabs spoken callback.

## Console check (already bought)

1. Twilio Console → Phone Numbers → Active numbers → `+18703804010`.
2. Confirm **Voice** is enabled.
3. Confirm **Messaging** is off (or unused). Do not register A2P for this DID.
4. Point **Voice** at the ElevenLabs agent import (see [02-elevenlabs.md](./02-elevenlabs.md)). No Messaging webhook.

## Dial park

`VA_DIAL_ARMED=false`. `POST /va/dial` stays 403 / parked. No live dials from this repo until Christopher says **arm**.
