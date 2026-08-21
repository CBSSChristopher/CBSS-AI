# CBSS Pay

Veem payment requests for CBShippingSolutions.

After deploy: `https://cbsspay.cbss.workers.dev`

Sign in with the same company email and CRM password. Type the amount Christopher set. The tool creates a Veem invoice and gives you the pay link. It does not invent a price. It does not send from Gmail. Veem may email the customer.

## Official Veem path

Follow [Introduction To Veem API](https://developer.veem.com/docs/intro-to-veem-api):

1. Register in Sandbox at `https://sandbox.veem.com` ([quick start](https://developer.veem.com/docs/sandbox-environment)). If that page is 403, email the Client IP and Ray ID to `clientservices@veem.com`.
2. In Sandbox: Settings → Integrations → Connect Veem API. Generate Client ID and Secret. API base is `https://sandbox-api.veem.com`.
3. Test invoices with no real money.
4. When ready for production, email `clientservices@veem.com` so they can complete setup. Production keys are only visible to the primary owner in `apps.veem.com`.

Production API is `https://api.veem.com`. Production may return `Account is Restricted, cannot generate tokens` until Veem enables API access.

```bash
cd cbss-pay
npx wrangler secret put AUTH_SECRET
npx wrangler secret put VEEM_CLIENT_ID
npx wrangler secret put VEEM_CLIENT_SECRET
npx wrangler deploy
```

Official invoice docs: https://developer.veem.com/docs/request-money-invoice
