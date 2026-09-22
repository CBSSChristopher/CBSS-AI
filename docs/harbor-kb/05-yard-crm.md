# 05 — The Yard CRM

Harbor opens on The Yard. Christopher Banks and Bryan Reese are the human closers. Harbor never collects payment.

There is **no Meta webhook**. Leads enter from a Meta Lead Ads **CSV import** only.

## Stage / owner machine

| Step | Owner | Book stage | CTE |
| --- | --- | --- | --- |
| CSV import | `New/Unassigned` | `New` | — |
| Harbor pull | `Harbor` | `Working` | CTE1 |
| No answer / voicemail | `Harbor` | `Working` | CTE2 → CTE3 → CTE4 |
| They answered | `Harbor` | `Working` | same CTE |
| Inbound answered (not solid) | `Harbor` | `Working` | same CTE |
| Soft delay / callback / inbound message | `Harbor` | `Follow-up` | same CTE |
| Ready to buy (out or in) | Christopher Banks or Bryan Reese | `Ready to buy` | same CTE |
| Not interested | keep | `Not interested` | stop |
| Bought elsewhere | keep | `Bought elsewhere` | stop |
| DNC | keep | `DNC` | stop |
| Wrong number | keep | `Email campaign` | off dial queue |

`New/Unassigned` is the **pile** (owner). Book stage stays `New`. Do not stamp imported rows as `New Lead`.

## CSV intake

- Real leads only. `TEST-…` names, `test-` lead ids, source `test` / `fixture` never enter the pile.
- Empty phone → skip.
- Upsert phone, then email.
- Extra columns → notes.
- Ready for Harbor pull. **Not** auto-dialed.

## CTE

Harbor self-assigns off New/Unassigned, then works CTE1 → CTE2 → CTE3 → CTE4.

- **Answered:** run sales, write the note.
- **No answer:** voicemail on **870-380-4010**, note it, advance CTE, next card.
- **NEVER** leave **870-323-2593** on voicemail.

## Soft delay vs hard no

**Soft delay** (talk to spouse, call tomorrow, send more info, not ready but keep them):

- Note the reason.
- Follow-up on the date they asked, or the next business day.
- Stay **Harbor** · **Follow-up**.
- Do **not** close-out. Do **not** DNC.
- “Send more info” = email draft, never SMS.

**Hard no** (not interested, wrong number, bought elsewhere, DNC):

- Polite close-out.
- No follow-up.
- Next lead.

## Ready-to-buy handoff

Warm, slightly cheesy accounting line (see [01-system-prompt.md](./01-system-prompt.md)). Then:

- Owner → **Christopher Banks** (default) or **Bryan Reese**.
- Stage → **Ready to buy**.
- Full note: quoted, size/type/condition, delivery/pickup, objections, soft promises, exact price if stated, payment path, spoken variant.
- Harbor does **not** collect payment. Cards frozen.

## Inbound voice

They call **+18703804010**. Harbor answers. Match CLI or create/attach a note. Solid → closer. Not solid → Harbor stays.

## Dial park

`VA_DIAL_ARMED=false`. Pull / assign / notes work. Live dial does not. Yard tests **161/161**.
