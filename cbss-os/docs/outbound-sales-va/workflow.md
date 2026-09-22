# Harbor outbound CTE workflow

Harbor is the **outbound opener** on The Yard. Christopher Banks and Bryan Reese (Brian on the call — roster name **Bryan Reese**) are the **human closers**. Harbor never collects payment. Cards stay frozen.

There is **no Meta webhook**. Leads enter from a Meta Lead Ads **CSV import** only.

## Stage / owner machine (visible on the card)

| Step | Owner | Book stage | CTE |
| --- | --- | --- | --- |
| CSV import | `New/Unassigned` | `New` | — |
| Harbor pull | `Harbor` | `Working` | CTE1 |
| No answer / voicemail | `Harbor` | `Working` | CTE2 → CTE3 → CTE4 |
| They answered | `Harbor` | `Working` | same CTE |
| Callback | `Harbor` | `Follow-up` | same CTE |
| Ready to buy | `Christopher Banks` or `Bryan Reese` | `Ready to buy` | same CTE |
| Not interested | keep | `Not interested` | stop |
| DNC | keep | `DNC` | stop |
| Wrong number | keep | `Email campaign` | off dial queue |

`New/Unassigned` is the **pile** (owner). Book stage stays the standard `New` so pipeline and Monday still add up. Do not stamp imported rows as `New Lead`.

## Hard rules

1. **Real leads only.** CSV rows that look like fixtures (`TEST-…` name, `test-` lead id, source `test` / `fixture`) never land on New/Unassigned and never enter the Harbor pull.
2. Harbor **self-assigns** off New/Unassigned, then works Yard CTE: CTE1 (call one), CTE2, CTE3, CTE4.
3. **Answered:** Harbor runs the sales talk and writes the outcome note. If they are ready to buy, hand off — **do not take a card**. Wire / ACH / e-check / money order / cashier’s check / cash only.
4. **No answer:** leave voicemail, note it like a rep, advance CTE, pull the next card. No stuck contacts.
5. Christopher and Bryan can open the card at any time and see owner + stage + CTE + notes.
6. `VA_DIAL_ARMED` stays `false`. Pull/assign/notes work. Live Twilio dial does not.

## APIs

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/va/leads/import` | Christopher. `{ csv }` or `{ rows }`. `dryRun: true` previews. |
| `GET` | `/va/harbor/next` | Christopher session, or `Authorization: Bearer VA_WEBHOOK_SECRET` plus `VA_CRM_*`. Assigns Harbor + CTE1. `dialing: false`. |
| `POST` | `/va/harbor/outcome` | Same auth. `{ contactId, outcome, closer?, note? }`. |

Outcomes: `no-answer`, `voicemail`, `answered`, `callback`, `ready-to-buy`, `not-interested`, `DNC`, `wrong-number`.

Closer field: `Christopher Banks` (default) or `Bryan Reese` (`Brian` maps to Bryan).
