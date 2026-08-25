# CBSS Invoicing

Standalone WAAVE invoice tool. It does not merge with Desk, CRM, Pay, or Proposal.

Live: `https://cbssinvoice.cbss.workers.dev`

Sign in with the same company email and CRM password. Type the amount Christopher set. Type the billing address and the delivery address (or check that they are the same). The tool asks WAAVE for a pay link. It does not invent a price. It does not collect a card number. It does not send from Gmail. Open Gmail to send the pay link; that draft CCs Christopher, Aliyah, and the signed-in rep, and includes both addresses. WAAVE may also email the customer when the payment-request send succeeds.

## WAAVE keys

From the WAAVE merchant dashboard, copy:

1. Public / access key
2. Secret / private key
3. Venue id

Add them as Worker secrets (never commit them):

```
npx wrangler secret put WAAVE_API_KEY
npx wrangler secret put WAAVE_API_SECRET
npx wrangler secret put WAAVE_VENUE_ID
```

Also set `AUTH_SECRET` once so company-email sessions work.

Production API base is `https://pg.getwaave.co`. Sandbox is `https://staging-pg.getwaave.co`. Requests sign with SHA-256 of `secret + full URL + JSON body` in `X-Api-Signature`, plus `X-Api-Key`.

Official docs:

- Checkout / transaction API: https://waave-client-support.tawk.help/article/waave-checkout-integration-custom-install
- Payment request (WaaveInvoice): https://waave-client-support.tawk.help/article/how-to-use-waave-payment-request-feature
