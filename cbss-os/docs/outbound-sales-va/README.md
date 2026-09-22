# Outbound sales VA (Harbor desk)

Harbor sales desk for **business shipping containers** only. Not personal storage fluff. Not the Harbor staff-comms Grok Bot.

Goal: Harbor opens on CTE (and answers inbound), then hands **ready-to-buy** to Christopher Banks or Bryan Reese with a warm accounting handoff. Harbor does not collect payment.

**No Meta webhook.** Leads enter from a Meta CSV (`docs/meta-lead-csv/`). Workflow: `workflow.md`. Scripts: `scripts.md`. Inbound: `inbound.md`.

v1 channels: **call + email only**. No SMS. CSV import → New/Unassigned pile → Harbor pull/CTE → closer handoff. Inbound **voice** callbacks hit Harbor. Twilio number is Voice-only (`twilio.md`) — Messaging / A2P not required. Email drafts only. Nothing dials until Christopher arms `VA_DIAL_ARMED`.

## Architecture

```
Meta Ads Manager CSV (iPad export)
        │
        ▼
POST /va/leads/import     (Christopher · The Yard)
        │  owner New/Unassigned · stage New · source facebook_lead_ads
        ▼
GET/POST /va/harbor/next  get_next_lead · due follow-ups on Harbor-assigned leads first, then New/Unassigned
        │
        ▼
POST /va/harbor/outcome   VM / answered / soft-delay / ready-to-buy / DNC …
        │
        ▼
Ready to buy → spoken handoff → owner Christopher Banks or Bryan Reese

Inbound: they call Harbor DID → POST /va/harbor/inbound
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
| SMS / text | out of scope | `POST /va/sms` and `/va/text` stay 403. Voice-only Twilio is enough. |

## Routes (Yard / cbssos)

| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/va/hooks/outbound` | `VA_WEBHOOK_SECRET` HMAC. No cookie. |
| `GET` | `/va/status` | Christopher session |
| `GET` | `/va/captures` | Christopher session |
| `POST` | `/va/captures/flush` | Christopher session. Writes pending captures to CRM notes. |
| `POST` | `/va/email/draft` | Company session. Returns a draft. Does not send. |
| `POST` | `/va/dial` | Company session. Parked. Never dials. |
| `POST` | `/va/sms` `/va/text` | Always 403. Harbor does not text. |
| `GET`/`POST` | `/va/harbor/next` · `/get-next-lead` | Christopher, webhook Bearer, or `HARBOR_QUOTE_TOKEN`. Due follow-ups then New/Unassigned. |
| `POST` | `/va/harbor/outcome` · `/update-lead` · `/log-outcome` | Same auth. Notes, CTE, VM, soft-delay, hard-no. |
| `POST` | `/va/harbor/inbound` | Same auth. They called the Harbor DID. |
| `POST` | `/va/harbor/quote` | `HARBOR_QUOTE_TOKEN` (`X-Harbor-Token` or Bearer). ZIP + box → same match as `/quote/match`. Never invents a price. Does not dial. |
| `POST` | `/va/harbor/ready-to-buy` | Same Harbor token. CRM note if matched; email/alert Christopher + Bryan. No SMS. |

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

- [persona.md](./persona.md) — system prompt (sales opener, not cashier)
- [scripts.md](./scripts.md) — ready-to-buy variants, voicemail, soft delay, hard no
- [inbound.md](./inbound.md) — they call the Harbor DID
- [twilio.md](./twilio.md) — Voice-only Buy Number (SMS off)
- [compliance.md](./compliance.md) — recording consent, TCPA, objections
- [outcomes.md](./outcomes.md) — call outcome taxonomy
- [payments.md](./payments.md) — cards frozen language
- [config-checklist.md](./config-checklist.md) — env placeholders
- [OPEN-TODOS.md](./OPEN-TODOS.md) — what Christopher taps next

Human / agent source of truth (no MCP bridge): [`docs/harbor-kb/`](../../../docs/harbor-kb/README.md).
