# CBSS Desk

Mini CBSS assistant for reps. They log in and get help writing the work.

Live URL after deploy: `https://cbssbrain.cbss.workers.dev`

## What it is

A locked desk. Same company email and CRM password.

Jobs:
- Ask — talk through a lead
- CRM note — paste-ready note
- Customer email — Christopher’s voice, draft only
- Proposal copy — formal wording; price only if Christopher already set one

It does **not** send email, save to the CRM, or invent a price.

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
