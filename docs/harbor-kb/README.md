# CBSS Harbor — Unified Knowledge Base

**One brain.** Yard ops + CRM + sales voice. Not two agents.

| | |
| --- | --- |
| Org | CBSS (CB Shipping Solutions) |
| Updated | 2026-09-22 |
| Cursor Harbor box | `bc-711f8685-d818-473d-b1ac-1fd96e69e69c` |
| ElevenLabs agent | `agent_5401m358q6x4fwgvqtjvmaspf5dr` — UI name **Harbor voice agent** |
| Harbor DID | `+18703804010` / 870-380-4010 |
| Sources merged | 3-week Yard/CRM cloud artifacts (~900) + `cbss-harbor-kb` sales locks |

## Read order (Harbor)

1. [00-identity.md](./00-identity.md) — hard locks  
2. [01-system-prompt.md](./01-system-prompt.md) — ElevenLabs paste  
3. [15-sales-rep-workflow.md](./15-sales-rep-workflow.md) — **CRM + quote loop first** (Twilio import last)  
4. [09-daily-callout-sop.md](./09-daily-callout-sop.md) — morning desk runbook  
5. [10-lead-card-spec.md](./10-lead-card-spec.md) — single lead card  
6. [05-yard-crm.md](./05-yard-crm.md) — CTE, follow-ups, ingest  
7. [14-zip-proposal-tooling.md](./14-zip-proposal-tooling.md) — ZIP + box → posted proposal quote  
8. [15-elevenlabs-tools.md](./15-elevenlabs-tools.md) — ElevenLabs webhook JSON  
9. [13-out-of-scope-deflection.md](./13-out-of-scope-deflection.md) — logistics / yard deflection  
10. [06-payments.md](./06-payments.md) · [07-product.md](./07-product.md)  
11. [02-elevenlabs.md](./02-elevenlabs.md) — voice agent (phone import **last**)  
12. [04-cursor-box.md](./04-cursor-box.md) · [08-north-star.md](./08-north-star.md)  
13. [11-contradictions.md](./11-contradictions.md) — old vs new flags  
14. [12-yard-history-index.md](./12-yard-history-index.md) — 3-week artifacts  
15. [CBSS_Harbor_Master_Reference.md](./CBSS_Harbor_Master_Reference.md) — full backbone  

## Cancelled

MCP / API Cursor↔ElevenLabs bridge. No live dials until Christopher says **arm**. Twilio phone-number import is **last** — do not work it until the CRM + quote loop is dry-run clean.
