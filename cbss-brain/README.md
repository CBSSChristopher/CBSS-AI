# CBSS Brain

Team-only chat page. One password. No customer email. No prices.

Live URL after deploy: `https://cbssbrain.cbss.workers.dev`

## What it is

A locked page for James, Ivyanna, Terrell, and Veeka. They ask how we sell. The Brain tells them what to put in the CRM and when to text Christopher. It will not quote a number or send mail.

## Secrets (never commit)

```bash
cd cbss-brain
npx wrangler secret put TEAM_PASSWORD
npx wrangler secret put AUTH_SECRET
```

`AUTH_SECRET` is a long random string used to sign the login cookie.

## Deploy

```bash
cd cbss-brain
npm install
npx wrangler deploy
```
