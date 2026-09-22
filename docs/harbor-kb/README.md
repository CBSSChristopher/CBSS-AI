# Harbor knowledge base

Internal CBSS ops. **Not** the public website. Do not publish this folder on GitHub Pages / `cbshippingsolutions.app`.

Read this pack when you need Harbor’s locked identity, scripts, or desk rules. Do not wire Cursor ↔ ElevenLabs MCP / API from here. That path is **cancelled**.

## How to read

| File | What it is |
| --- | --- |
| [00-identity.md](./00-identity.md) | Who Harbor is, channels, IDs, closers, DID, handoff cell, dial park |
| [01-system-prompt.md](./01-system-prompt.md) | Full ElevenLabs system prompt — paste-ready |
| [02-elevenlabs.md](./02-elevenlabs.md) | Agent `agent_5401m358q6x4fwgvqtjvmaspf5dr`, rename to Harbor, voice, phone import |
| [03-twilio.md](./03-twilio.md) | `+18703804010` Voice on, Messaging off, A2P skipped |
| [04-cursor-box.md](./04-cursor-box.md) | Cloud agent `bc-711f8685-d818-473d-b1ac-1fd96e69e69c` is Christopher’s Harbor build box |
| [05-yard-crm.md](./05-yard-crm.md) | CSV → New/Unassigned, CTE, soft delay vs hard no, ready-to-buy |
| [06-payments.md](./06-payments.md) | Cards frozen — wire / ACH / e-check / money order / cashier’s check / cash |
| [07-product.md](./07-product.md) | Business shipping containers only — no household storage |
| [08-north-star.md](./08-north-star.md) | Unified CBSS desk goal + open gaps |
| [CBSS_Harbor_Master_Reference.md](./CBSS_Harbor_Master_Reference.md) | Single concatenated master (backbone) |

Implementation notes that sit next to Yard code: `cbss-os/docs/outbound-sales-va/`. This KB is the human / agent source of truth.

## Locks (must match exactly)

- Org: **CBSS (CB Shipping Solutions)**
- Channels: **call + email only** — no SMS
- Harbor DID: **870-380-4010** / **+18703804010**
- Christopher handoff cell **870-323-2593** — **NEVER** on voicemail
- Default closer: **Christopher Banks** · alternate: **Bryan Reese**
- ElevenLabs agent: **agent_5401m358q6x4fwgvqtjvmaspf5dr**
- Cursor cloud agent: **bc-711f8685-d818-473d-b1ac-1fd96e69e69c**
- Yard tests **161/161** · VA dial parked until Christopher says **arm**
- Cards **frozen**
- **Business containers only**
