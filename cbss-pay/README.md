# CBSS Pay

Veem payment requests for CBShippingSolutions.

After deploy: `https://cbsspay.cbss.workers.dev`

Sign in with the same company email and CRM password. Type the amount Christopher set. The tool creates a Veem invoice and gives you the pay link. It does not invent a price. It does not send from Gmail. Veem may email the customer.

## Veem keys

In `apps.veem.com` go to Settings → Integrations → Connect Veem API. Generate the Client ID and Client Secret (primary account owner). Then:

```bash
cd cbss-pay
npx wrangler secret put AUTH_SECRET
npx wrangler secret put VEEM_CLIENT_ID
npx wrangler secret put VEEM_CLIENT_SECRET
npx wrangler deploy
```

Production API is `https://api.veem.com`. Sandbox is `https://sandbox-api.veem.com` if you are still testing.

Official docs: https://developer.veem.com/docs/request-money-invoice
