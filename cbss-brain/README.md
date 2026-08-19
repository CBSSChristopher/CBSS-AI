# CBSS Desk

Mini CBSS assistant for reps. They log in and get help writing the work, and Live Call writes into the CRM.

Live URL after deploy: `https://cbssbrain.cbss.workers.dev`

## What it is

A locked desk. Same company email and CRM password.

Jobs:
- Live call — feed scraps on the phone; it summarizes, writes the CRM note, and books CTE or the next follow-up
- Ask — talk through a lead
- CRM note draft — paste-ready note if you only need copy
- Customer email — Christopher’s voice, draft only
- Proposal copy — formal wording; price only if Christopher already set one

CTE means Call, then Text, then Email. That is first outreach. If the lead makes it past CTE, the desk books one real follow-up instead. The CRM has one follow-up slot per contact; the full CTE plan is stored in the note.

It does **not** send email or invent a price.

Live Call always reads the CRM first, then writes. It will not replace the notes map unless the protected existing notes are still present.

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
