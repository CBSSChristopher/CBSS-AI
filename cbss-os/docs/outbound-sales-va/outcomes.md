# Call outcome taxonomy

Exactly one outcome per capture.

The original setter webhook (`POST /va/hooks/outbound`) still uses the seven slugs below.

Harbor CTE (`POST /va/harbor/outcome` and `/va/harbor/inbound`) uses the Harbor slugs in [workflow.md](./workflow.md).

## Webhook slugs (setter capture)

| Slug | Meaning | CRM note? |
| --- | --- | --- |
| `no-answer` | Ring / voicemail / dead air. No live conversation. | Yes, if a contact matches and is not do-not-touch. |
| `gatekeeper` | Reached a person who is not the buyer and would not pass you. | Yes, same rule. |
| `not-interested` | Live buyer said no. Business or personal-storage mismatch. | Yes, same rule. |
| `callback` | Live contact. Agreed a later window. Not booked with the closer. | Yes. |
| `booked` | Qualified appointment (call or site visit) with the closer. | Yes. Include time + closer name. |
| `DNC` | They asked to be left alone, or the number is on the do-not-touch list. | Yes — this is how the book learns. |
| `wrong-number` | Number does not belong to the named lead. | Yes, if a contact matches. |

## Harbor CTE slugs

| Slug | Card |
| --- | --- |
| `no-answer` | Harbor · Working · next CTE |
| `voicemail` | Harbor · Working · next CTE · Harbor DID callback |
| `answered` | Harbor · Working |
| `callback` / `soft-delay` | Harbor · Follow-up · follow-up task |
| `inbound-answered` | Harbor · Working |
| `inbound-message` | Harbor · Follow-up |
| `ready-to-buy` / `inbound-ready-to-buy` | Christopher or Bryan · Ready to buy · full closer note |
| `not-interested` | Not interested · no follow-up |
| `bought-elsewhere` | Bought elsewhere · no follow-up |
| `DNC` | DNC · no follow-up |
| `wrong-number` | Email campaign · off dial queue |

## Aliases the webhook accepts

`no_answer`, `no answer`, `voicemail` → `no-answer`

`gate`, `receptionist` → `gatekeeper`

`not interested`, `ni`, `no` → `not-interested`

`call back`, `call-back` → `callback`

`book`, `appointment`, `site visit`, `booked-call` → `booked`

`do not call`, `do-not-call`, `do not contact`, `dnc` → `DNC`

`wrong number`, `bad number`, `disconnected` → `wrong-number`

Unknown text is rejected. Do not invent a new slug in the agent.

## Note shape (Book tag)

```
VA outbound · booked · Acme Welding · 8705550100 · closer Christopher Banks · 2026-09-22T17:00:00Z
Appointment: Thu 2pm site visit
Summary: Jobsite 40HC delivery, buyer is Pat.
```

Ready-to-buy Harbor notes use the full closer block in [scripts.md](./scripts.md).

Transcript is stored on the KV capture and clipped on the CRM note so the card stays readable.
