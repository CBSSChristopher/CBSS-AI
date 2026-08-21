# CBSS Desk

Rep desk for CBShippingSolutions. Same company email and CRM password.

Live URL: `https://cbssbrain.cbss.workers.dev`

## Jobs

- **Ask** — talk through a lead or a messy note
- **Call** — dump scraps; it writes the CRM note and books CTE or one follow-up
- **Email templates** — Chris-voice outbound mail, or **Log a reply** to paste a customer email and save it to the CRM

Custom email / proposal wording sits under Email templates → *Custom draft or proposal wording*.

CTE means Call, then Text, then Email. That is first outreach. Past CTE books one real follow-up instead. The CRM has one follow-up slot per contact; the full CTE plan is stored in the note.

The desk does **not** send email or invent a price.

Call always reads the CRM first, then writes. It will not replace the notes map unless the protected existing notes are still present.

## Secrets

```bash
cd cbss-brain
npx wrangler secret put AUTH_SECRET
```

`AUTH_SECRET` signs the login cookie. Optional fallback: `TEAM_PASSWORD` if CRM login is down.

## Deploy

```bash
cd cbss-brain
npm install
npx wrangler deploy
```
