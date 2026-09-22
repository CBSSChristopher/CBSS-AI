# Meta Lead Ads CSV → The Yard

**The Facebook Lead Ads webhook / Cloudflare Meta bridge is abandoned.** Do not paste `FB_WEBHOOK_VERIFY_TOKEN` or a callback URL for this flow. Harbor does not receive Meta webhooks.

Christopher exports a CSV from Meta (iPad-friendly) and uploads it on The Yard.

## How to export (Meta)

1. Ads Manager → the lead form campaign.
2. Leads → Download / Export CSV.
3. Save the file on the iPad.
4. Open The Yard → CRM → **VA calls** (Christopher) → **Import Meta CSV**.
5. Preview, then **Import to New/Unassigned**.

Or Master Chief can hand Harbor the file in chat. Harbor posts `POST /va/leads/import` with `{ csv }` while Christopher is signed in — Harbor will not invent rows.

No watched local folder. The iPad cannot host that.

## Columns (case-insensitive)

| Need | Headers accepted |
| --- | --- |
| **Required to dial** | `phone`, `phone_number`, `mobile`, `cell` |
| **Name** | `full_name` / `name` **or** `first_name` + `last_name` |
| Optional | `email`, `company`, `city`, `state`, `zip`, `created_time`, `campaign_name`, `ad_name`, `form_name`, `lead_id` / `id` |
| Passthrough | any other column → activity note |

Empty phone → skipped and counted. DNC cards are not overwritten. `TEST-` / fixture rows never enter the pile.

## What lands on the book

- Owner: **`New/Unassigned`** (the pile Harbor pulls)
- Stage: **`New`** (not `New Lead`)
- Source: `facebook_lead_ads` (method `meta_csv`)
- Extra form answers: Book note
- Outbound queue: VA capture, **not dialed**

Harbor then: pull → owner `Harbor` → CTE1–4 → ready-to-buy handoff to Christopher or Bryan Reese. See `docs/outbound-sales-va/workflow.md`.
