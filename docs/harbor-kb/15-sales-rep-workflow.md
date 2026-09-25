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
use-case rapport (yeah I love that use → mirror → then qualify)
    │
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
    ├── soft-delay → Follow-up date · stay Harbor · live AgentMail CTE template · next card
    ├── hard-no    → close-out · no follow-up · next card
    ├── VM / no-answer → note · live AgentMail CTE template for the step just worked · CTE+1 · next card
    └── ready-to-buy → harbor_ready_to_buy
              notify Christopher Banks (default) + Bryan Reese
              owner closer · stage Ready to buy
              no payment · no SMS
```

`VA_DIAL_ARMED` stays `false`. Quote and CRM writes are not dials.

Harbor CTE steps fire **live** AgentMail templates like any Yard rep (`runCteWork` → `fireTemplate` → `sendAgentMail`). No-answer, voicemail, and soft-delay send the step Harbor just worked (CTE1 on a new card; CTE2/3/4 when that step is logged, and again from the cron when those sends come due). Reply-To is Harbor (`harbor@cbshippingsolutions.com`), not a blank address and not Christopher’s personal mailbox. From is the AgentMail inbox. The lead’s email is `to`. Dial stays parked. No SMS. Ready-to-buy notify is still Christopher Banks + Bryan Reese only. Paid / Next Steps CC (Christopher + Aliyah, plus the assigned rep when resolved) is unchanged. Due follow-ups stay Harbor-owned cards only.

## Tools → Yard routes

Auth: `X-Harbor-Token` or `Authorization: Bearer` === secret `HARBOR_QUOTE_TOKEN` (Christopher: `npx wrangler secret put HARBOR_QUOTE_TOKEN` on `cbssos`). Bearer `VA_WEBHOOK_SECRET` still works. Christopher session still works.

| Tool | Route | What it does |
| --- | --- | --- |
| `get_next_lead` | `GET`/`POST` `/va/harbor/next` or `/va/harbor/get-next-lead` | Due follow-ups on Harbor-assigned leads first, then New/Unassigned. New/Unassigned is global. Due follow-ups require owner Harbor (`isHarborOwner`) — other reps' Yard cards stay off this queue. Assigns Harbor. `dialing: false`. |
| `update_lead` | `POST` `/va/harbor/update-lead` or `/va/harbor/outcome` | Note-only (no `outcome`) appends a CRM note. Optional `cteStage`. |
| `log_outcome` | `POST` `/va/harbor/log-outcome` or `/va/harbor/outcome` | `voicemail`, `no-answer`, `soft-delay`, `answered`, `not-interested`, `DNC`, `wrong-number`, `bought-elsewhere`, `ready-to-buy`. No-answer, voicemail, and soft-delay fire the **current** CTE template through the same `fireTemplate` / AgentMail path a human Yard rep uses. To = lead email. From = `AGENTMAIL_INBOX` (`cbss@agentmail.to` unless overridden). Reply-To = `harbor@cbshippingsolutions.com`. CTE template CC stays empty (AgentMail still adds the existing Christopher tracking CC). Paid / Next Steps CC is unchanged. If AgentMail is not configured, the send fails closed — no stub success. `dialing: false`. `sms: false`. |
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
7. `POST /va/harbor/log-outcome` `{ contactId, outcome: "voicemail" }` — CTE advances, still Harbor, `dialing: false`, and CTE1 (or the step just worked) goes out as a live AgentMail send. Reply-To is Harbor. A missing `AGENTMAIL_API_KEY` is a hard fail, not a fake ok. Desk script: `node --experimental-strip-types scripts/harbor-cte1-dry-run.mjs` (fail closed without the key). On the Worker, `npx wrangler dev scripts/harbor-cte1-dry-run-worker.ts --name cbssos --remote --port 8791` uses the real secret. Do not deploy that file as The Yard.
8. `POST /va/harbor/log-outcome` `{ contactId, outcome: "soft-delay", reason: "call tomorrow" }` — Follow-up set, stays Harbor.
9. Pull again: due follow-ups on Harbor-assigned leads first, then New/Unassigned. A due Follow-up owned by James, Bryan, Christopher, or any other rep is not returned. CTE is **not** reset to CTE1.
10. `POST /va/harbor/log-outcome` `{ outcome: "not-interested" }` on a throwaway — closed, no follow-up.
11. On a separate card: quote then `POST /va/harbor/ready-to-buy` — Christopher + Bryan notified by email/in-Yard alert. No SMS. A practice or spoken test passes `dry_run: true` on that same route: the tool still returns ok, and email, alert, and the CRM note are skipped.
12. `POST /va/dial` still 403. No Twilio console work. No phone-number import.

## Out of this pass

- Twilio number import / ElevenLabs phone assign — **last**, after this loop is dry-run clean.
- Live customer dials.
- SMS / Messaging / A2P.
- Payment collection.

Logistics / ETA still deflect ([13-out-of-scope-deflection.md](./13-out-of-scope-deflection.md)). ZIP quote is only a posted proposal match.
