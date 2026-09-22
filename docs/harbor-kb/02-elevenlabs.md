# 02 — ElevenLabs

## Locked agent

| Field | Value |
| --- | --- |
| Agent ID | `agent_5401m358q6x4fwgvqtjvmaspf5dr` |
| UI name | **Harbor** (rename if the console still shows a placeholder) |
| Org | CBSS (CB Shipping Solutions) |
| Role | Voice sales desk — not cashier, not Christopher clone |

Do **not** stand up a Cursor ↔ ElevenLabs MCP / API bridge. That path is cancelled. Christopher pastes the prompt and imports the phone in the ElevenLabs UI.

## Rename to Harbor

1. Open [ElevenLabs Conversational / Agents](https://elevenlabs.io/app/conversational-ai).
2. Open agent `agent_5401m358q6x4fwgvqtjvmaspf5dr`.
3. Set the display name to **Harbor**.
4. Paste the full system prompt from [01-system-prompt.md](./01-system-prompt.md).

## Voice

- Neutral professional American.
- Warm, not stiff.
- **Do not clone Christopher** without a written decision in this repo or mail.

## Phone import (Twilio Voice DID)

Harbor DID: **+18703804010** (870-380-4010). Voice on. Messaging off. A2P skipped.

Import steps (UI):

1. Open the phone-numbers page: [https://elevenlabs.io/app/conversational-ai/phone-numbers](https://elevenlabs.io/app/conversational-ai/phone-numbers)
2. Import / connect a **Twilio** number (not a new SMS-capable buy inside ElevenLabs).
3. Enter `+18703804010`.
4. Attach it to agent `agent_5401m358q6x4fwgvqtjvmaspf5dr`.
5. Voice inbound only. Do **not** attach a Messaging / SMS webhook.

Official product notes: [https://elevenlabs.io/docs/agents-platform/phone-numbers](https://elevenlabs.io/docs/agents-platform/phone-numbers)

Callback spoken on voicemail is **870-380-4010**. Never **870-323-2593**.

## Park

Do not place test customer calls from this repo. `VA_DIAL_ARMED` stays false until Christopher says **arm**.
