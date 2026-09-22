# Harbor outbound + inbound CTE workflow

Harbor is the **sales opener** on The Yard. Christopher Banks and Bryan Reese (Brian on the call — roster name **Bryan Reese**) are the **human closers**. Harbor never collects payment. Cards stay frozen.

There is **no Meta webhook**. Leads enter from a Meta Lead Ads **CSV import** only.

Inbound: when they call the Twilio Harbor DID, Harbor answers. Same qualification. Ready-to-buy still hands to Christopher or Bryan.

## Stage / owner machine (visible on the card)

| Step | Owner | Book stage | CTE |
| --- | --- | --- | --- |
| CSV import | `New/Unassigned` | `New` | — |
| Harbor pull | `Harbor` | `Working` | CTE1 |
| No answer / voicemail | `Harbor` | `Working` | CTE2 → CTE3 → CTE4 |
| They answered | `Harbor` | `Working` | same CTE |
| Inbound answered (not solid) | `Harbor` | `Working` | same CTE |
| Soft delay / callback / inbound message | `Harbor` | `Follow-up` | same CTE |
| Ready to buy (out or in) | `Christopher Banks` or `Bryan Reese` | `Ready to buy` | same CTE |
| Not interested | keep | `Not interested` | stop |
| Bought elsewhere | keep | `Bought elsewhere` | stop |
| DNC | keep | `DNC` | stop |
| Wrong number | keep | `Email campaign` | off dial queue |

`New/Unassigned` is the **pile** (owner). Book stage stays the standard `New` so pipeline and Monday still add up. Do not stamp imported rows as `New Lead`.

## Hard rules

1. **Real leads only.** CSV rows that look like fixtures (`TEST-…` name, `test-` lead id, source `test` / `fixture`) never land on New/Unassigned and never enter the Harbor pull.
2. Harbor **self-assigns** off New/Unassigned, then works Yard CTE: CTE1 (call one), CTE2, CTE3, CTE4.
3. **Answered:** Harbor runs the sales talk and writes the outcome note. If they are ready to buy, spoken accounting handoff, then owner Christopher or Bryan — **do not take a card**. Wire / ACH / e-check / money order / cashier’s check / cash only.
4. **Ready-to-buy notes are full:** quoted, size/type/condition, delivery/pickup, objections cleared, soft promises, exact price if stated, payment path, spoken variant. See [scripts.md](./scripts.md).
5. **Soft delay** (talk to spouse, call tomorrow, send more info, not ready but keep them): note the reason, set a follow-up for that date or the next business day, stay on Harbor · Follow-up. Do **not** close-out or DNC.
6. **Hard no** (not interested, wrong number, bought elsewhere, DNC): polite close-out, no follow-up, next lead.
7. **No answer:** leave voicemail (Harbor DID callback, never `(870) 323-2593`), note it like a rep, advance CTE, pull the next card. No stuck contacts.
8. **Inbound:** match CLI or create/attach a note. Solid → Christopher or Bryan. Not solid → Harbor handles.
9. Christopher and Bryan can open the card at any time and see owner + stage + CTE + notes.
10. `VA_DIAL_ARMED` stays `false`. Pull/assign/notes work. Live Twilio dial does not.
11. **Call + email only.** Harbor never SMS / texts a lead. Twilio DID is Voice only — Messaging not required. See [twilio.md](./twilio.md).

## APIs

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/va/leads/import` | Christopher. `{ csv }` or `{ rows }`. `dryRun: true` previews. |
| `GET` | `/va/harbor/next` | Christopher session, or `Authorization: Bearer VA_WEBHOOK_SECRET` plus `VA_CRM_*`. Assigns Harbor + CTE1. `dialing: false`. |
| `POST` | `/va/harbor/outcome` | Same auth. `{ contactId, outcome, closer?, note?, deal fields?, followUpDate?, spoken? }`. |
| `POST` | `/va/harbor/inbound` | Same auth. `{ phone / from, outcome?, closer?, deal fields? }`. Matches CLI or creates a Harbor card. |
| `POST` | `/va/harbor/quote` | `X-Harbor-Token` / Bearer `HARBOR_QUOTE_TOKEN`. ZIP + box → same match as `/quote/match`. `spoken_summary` + `unit_price`. `no_match` never invents a price. `dialing: false`. |
| `POST` | `/va/harbor/ready-to-buy` | Same Harbor token. Rematch quote, CRM note if matched, email/alert Christopher + Bryan. No SMS. |

Outcomes: `no-answer`, `voicemail`, `answered`, `callback`, `soft-delay`, `ready-to-buy`, `inbound-answered`, `inbound-message`, `inbound-ready-to-buy`, `not-interested`, `bought-elsewhere`, `DNC`, `wrong-number`.

Closer field: `Christopher Banks` (default) or `Bryan Reese` (`Brian` maps to Bryan).

Ready-to-buy / inbound-ready-to-buy body may include `quoted`, `size`, `type`, `condition`, `delivery`, `objections`, `promises`, `price`, `spoken` (variant id), `closer`.
