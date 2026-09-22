# 08 — North star

## Unified CBSS desk

One Harbor. One book. One closer of record.

Christopher Banks (or Bryan Reese when named) closes money. Harbor opens the conversation — outbound CTE and inbound voice on **870-380-4010** — then writes the truth on The Yard card.

The desk sells **business shipping containers** for CBSS (CB Shipping Solutions). Channels are **call + email only**. Cards stay **frozen**. Harbor never texts. Harbor never takes payment. Christopher’s personal cell **870-323-2593** never goes on a customer voicemail.

The Cursor cloud agent `bc-711f8685-d818-473d-b1ac-1fd96e69e69c` is the **build box**. ElevenLabs `agent_5401m358q6x4fwgvqtjvmaspf5dr` is the **voice**. Twilio `+18703804010` is the **line**. The Yard is the **book**. Those four stay separate. Do not merge them with an MCP / API bridge. That path is cancelled.

Nothing dials until Christopher says **arm**.

## Open gaps checklist

Use this as the next-tap list. Do not invent keys. Do not dial.

| Gap | Owner | Status |
| --- | --- | --- |
| Rename ElevenLabs agent UI to **Harbor** | Christopher | Open — agent id locked |
| Paste [01-system-prompt.md](./01-system-prompt.md) into the agent | Christopher | Open |
| Pick a neutral voice (no Christopher clone) | Christopher | Open |
| Import `+18703804010` on [ElevenLabs phone-numbers](https://elevenlabs.io/app/conversational-ai/phone-numbers) | Christopher | Open — Voice only |
| Confirm Twilio Messaging off / A2P skipped | Christopher | Locked intent — verify in console |
| Paste `VA_WEBHOOK_SECRET` / Twilio SID+token on `cbssos` (secrets, never git) | Christopher | Open |
| Import a **real** Meta CSV onto New/Unassigned (preview first) | Christopher | Open |
| Harbor CTE on that pile | Christopher | Open — pull works, dial parked |
| Say **arm** before `VA_ENABLED` / `VA_DIAL_ARMED` | Christopher | Parked — do not flip |
| Yard tests | Harbor box | **161/161** last locked |
| Cursor ↔ ElevenLabs MCP / API bridge | — | **Cancelled. Do not rebuild.** |
| SMS / A2P | — | **Out of scope** |
| Card checkout / Veem | — | **Frozen / parked** |
| Household storage desk | — | **Out of scope** |

When every row above is either done or still parked on purpose, Harbor is one desk: CSV in, CTE out, inbound back, ready-to-buy to Christopher or Bryan.
