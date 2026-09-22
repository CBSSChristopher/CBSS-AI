# Harbor sales-rep workflow (CRM + quote first)

Christopher lock (2026-09-22): **workflow first. Twilio import last. Do not work phone-number import.**

Harbor works the book **like a sales rep**. `get_next_lead` is due follow-ups on Harbor-assigned leads first, then New/Unassigned. New/Unassigned is the global unassigned pool. Due follow-ups are Harbor-owner only — a Follow-up owned by James, Bryan, Christopher, or any other rep is not Harbor's card. No live dials until Christopher says **arm**. No SMS. Cards frozen. Harbor never collects payment.

## The loop

```
get_next_lead
    │  due follow-ups on Harbor-assigned leads first, then New/Unassigned
    │  New/Unassigned is the global unassigned pool
    │  due follow-ups are Harbor-owner only (not James, Bryan, Christopher, or any other rep)
    │  self-assign owner Harbor · Working
    │  pile → CTE1   follow-up → keep current CTE
    ▼
qualify  (company, box, ZIP, delivery/pickup)
    │
    ▼
harbor_quote_by_zip   POST /va/harbor/quote
    │  same match as Yard POST /quote/match
    │  speak spoken_summary · if no_match do not invent a price
    ▼
update_lead / log_outcome   POST /va/harbor/outcome
    │  notes · CTE · voicemail · soft-delay · hard-no
    │
    ├── soft-delay → Follow-up date · stay Harbor · next card
    ├── hard-no    → close-out · no follow-up · next card
    ├── VM / no-answer → note · CTE+1 · next card
    └── ready-to-buy → harbor_ready_to_buy
              notify Christopher Banks (default) + Bryan Reese
              owner closer · stage Ready to buy
              no payment · no SMS
```

`VA_DIAL_ARMED` stays `false`. Quote and CRM writes are not dials.

## Tools → Yard routes

Auth: `X-Harbor-Token` or `Authorization: Bearer` === secret `HARBOR_QUOTE_TOKEN` (Christopher: `npx wrangler secret put HARBOR_QUOTE_TOKEN` on `cbssos`). Bearer `VA_WEBHOOK_SECRET` still works. Christopher session still works.

| Tool | Route | What it does |
| --- | --- | --- |
| `get_next_lead` | `GET`/`POST` `/va/harbor/next` or `/va/harbor/get-next-lead` | Due follow-ups on Harbor-assigned leads first, then New/Unassigned. New/Unassigned is global. Due follow-ups require owner Harbor (`isHarborOwner`) — other reps' Yard cards stay off this queue. Assigns Harbor. `dialing: false`. |
| `update_lead` | `POST` `/va/harbor/update-lead` or `/va/harbor/outcome` | Note-only (no `outcome`) appends a CRM note. Optional `cteStage`. |
| `log_outcome` | `POST` `/va/harbor/log-outcome` or `/va/harbor/outcome` | `voicemail`, `no-answer`, `soft-delay`, `answered`, `not-interested`, `DNC`, `wrong-number`, `bought-elsewhere`, `ready-to-buy`. |
| `harbor_quote_by_zip` | `POST` `/va/harbor/quote` | Posted proposal match. Never invent price. |
| `harbor_ready_to_buy` | `POST` `/va/harbor/ready-to-buy` | Rematch + CRM note if matched + email/alert Christopher + Bryan. |

JSON paste for ElevenLabs: [15-elevenlabs-tools.md](./15-elevenlabs-tools.md). No Cursor MCP into ElevenLabs.

## Dry-run simulation checklist (no Twilio)

Do this on a **Test-** tagged card or a dry book. Do **not** import the Harbor DID. Do **not** place a PSTN call.

1. Confirm `wrangler.jsonc` has `VA_ENABLED=false` and `VA_DIAL_ARMED=false`.
2. Set `HARBOR_QUOTE_TOKEN` (and `VA_CRM_EMAIL` / `VA_CRM_PASSWORD` for CRM + inventory) on a preview Worker or local `wrangler dev` — never commit the values.
3. Import or park one **non-production** New/Unassigned row with a real-looking phone (or use an existing Test-skip rule if you must not pollute the pile).
4. `POST /va/harbor/get-next-lead` with the token. Expect `source: "new-unassigned"`, `cteStage: "CTE1"`, `dialing: false`, owner Harbor.
5. `POST /va/harbor/quote` with a real 5-digit ZIP + box. If `ok` is false, `unit_price` is null — do not invent a dollar.
6. `POST /va/harbor/update-lead` with `{ contactId, note: "Qualified: 40HC, ZIP …" }` — note lands, no disposition change.
7. `POST /va/harbor/log-outcome` `{ contactId, outcome: "voicemail" }` — CTE advances, still Harbor, `dialing: false`.
8. `POST /va/harbor/log-outcome` `{ contactId, outcome: "soft-delay", reason: "call tomorrow" }` — Follow-up set, stays Harbor.
9. Pull again: due follow-ups on Harbor-assigned leads first, then New/Unassigned. A due Follow-up owned by James, Bryan, Christopher, or any other rep is not returned. CTE is **not** reset to CTE1.
10. `POST /va/harbor/log-outcome` `{ outcome: "not-interested" }` on a throwaway — closed, no follow-up.
11. On a separate card: quote then `POST /va/harbor/ready-to-buy` — Christopher + Bryan notified by email/in-Yard alert. No SMS.
12. `POST /va/dial` still 403. No Twilio console work. No phone-number import.

## Out of this pass

- Twilio number import / ElevenLabs phone assign — **last**, after this loop is dry-run clean.
- Live customer dials.
- SMS / Messaging / A2P.
- Payment collection.

Logistics / ETA still deflect ([13-out-of-scope-deflection.md](./13-out-of-scope-deflection.md)). ZIP quote is only a posted proposal match.
