# Outbound sales VA (phone setter)

Appointment-setter for **business shipping containers** only. Not personal storage fluff. Not the Harbor staff-comms Grok Bot.

Goal: Harbor opens on CTE, then hands **ready-to-buy** to Christopher Banks or Bryan Reese. Harbor does not collect payment.

**No Meta webhook.** Leads enter from a Meta CSV (`docs/meta-lead-csv/`). Workflow: `workflow.md`.

v1 channel: CSV import → New/Unassigned pile → Harbor pull/CTE → closer handoff. ElevenLabs + Twilio later. Email drafts only. Nothing dials until Christopher arms `VA_DIAL_ARMED`.

## Architecture

```
Meta Ads Manager CSV (iPad export)
        │
        ▼
POST /va/leads/import     (Christopher · The Yard)
        │  owner New/Unassigned · stage New · source facebook_lead_ads
        ▼
GET /va/harbor/next       Harbor self-assigns · CTE1 · Working
        │
        ▼
POST /va/harbor/outcome   VM / answered / ready-to-buy / DNC …
        │
        ▼
Ready to buy → owner Christopher Banks or Bryan Reese
```

The Facebook Lead Ads Cloudflare webhook (`/va/hooks/facebook-leads`) is **abandoned**. Do not ask for FB app secrets for this flow.

This pack reuses The Yard and the live CRM `appendNote` path. It does **not** invent a second CRM.

## What is parked

| Switch | Default | Effect |
| --- | --- | --- |
| `VA_ENABLED` | `false` | Phone VA is off. Webhook can still *receive* test events once the secret exists. |
| `VA_DIAL_ARMED` | `false` | `POST /va/dial` stays 403. |
| Live Twilio REST | not implemented | Even if both flags are true and secrets are present, `/va/dial` returns 501. Harbor will not call Twilio from this repo until Christopher says go. |
| Email sequences | drafts only | `POST /va/email/draft` returns text. Never AgentMail. Never Gmail. |

## Routes (Yard / cbssos)

| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/va/hooks/outbound` | `VA_WEBHOOK_SECRET` HMAC. No cookie. |
| `GET` | `/va/status` | Christopher session |
| `GET` | `/va/captures` | Christopher session |
| `POST` | `/va/captures/flush` | Christopher session. Writes pending captures to CRM notes. |
| `POST` | `/va/email/draft` | Company session. Returns a draft. Does not send. |
| `POST` | `/va/dial` | Company session. Parked. Never dials. |

Webhook URL after a Yard deploy Christopher approves:

`https://floor.cbshippingsolutions.app/va/hooks/outbound`

## CRM write path

1. Webhook stores the capture in Yard `SESSIONS` KV (same namespace as CTE / cycle).
2. Christopher opens **CRM → VA calls** and clicks **Write pending to CRM**, or Harbor flushes with his signed-in session.
3. Optional later: set `VA_CRM_EMAIL` + `VA_CRM_PASSWORD` (placeholders only in docs) so the webhook can flush without a browser session. Do not commit those values.
4. Notes use the existing `appendNote` action and `Book` tag — same as CTE / Desk activity.
5. Match order: `contactId` on the payload, then digits-only phone against the book.
6. If the card is DNC / do-not-touch, skip the write unless the VA outcome is `DNC` (so the book sees why we stopped).

**No CRM schema migration ships in this PR.** The CRM worker source is not in this repo (`cbss-crm/` here is not the Worker). Captures live in Yard KV. Activity is a note on the contact that already exists.

## Identity

- Voice may say it is the **CB Shipping Solutions outbound desk**.
- Do not claim to be Christopher.
- Do not clone Christopher’s voice without a written decision. v1 voice is a **neutral professional placeholder**.
- Harbor (this Grok Bot) writes internal staff mail. This VA does not.

## Pack

- [persona.md](./persona.md) — system prompt (setter, not closer)
- [compliance.md](./compliance.md) — recording consent, TCPA, objections
- [outcomes.md](./outcomes.md) — call outcome taxonomy
- [payments.md](./payments.md) — cards frozen language
- [config-checklist.md](./config-checklist.md) — env placeholders
- [OPEN-TODOS.md](./OPEN-TODOS.md) — what Christopher taps next
