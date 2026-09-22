# Call outcome taxonomy

Exactly one outcome per capture. The webhook and CRM note use these slugs.

| Slug | Meaning | CRM note? |
| --- | --- | --- |
| `no-answer` | Ring / voicemail / dead air. No live conversation. | Yes, if a contact matches and is not do-not-touch. |
| `gatekeeper` | Reached a person who is not the buyer and would not pass you. | Yes, same rule. |
| `not-interested` | Live buyer said no. Business or personal-storage mismatch. | Yes, same rule. |
| `callback` | Live contact. Agreed a later window. Not booked with the closer. | Yes. |
| `booked` | Qualified appointment (call or site visit) with the closer. | Yes. Include time + closer name. |
| `DNC` | They asked to be left alone, or the number is on the do-not-touch list. | Yes — this is how the book learns. |
| `wrong-number` | Number does not belong to the named lead. | Yes, if a contact matches. |

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

Transcript is stored on the KV capture and clipped on the CRM note so the card stays readable.
