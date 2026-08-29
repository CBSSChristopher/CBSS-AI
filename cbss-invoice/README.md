# CBSS Invoicing

Standalone invoice tool. It does not merge with Desk, CRM, Pay, or Proposal.

Live: `https://cbssinvoice.cbss.workers.dev`

Sign in with the same company email and CRM password. Type the amount Christopher set. Type the billing address and the delivery address (or check that they are the same). The tool builds the navy/gold CBSS invoice — Times “CB” mark, Helvetica body, gold invoice number — and always prints ACH, domestic wire, and SWIFT on page 2. Use **Invoice — ACH / wire only** when they will not pay by card: they still get the branded invoice and a Gmail draft, with no WAAVE card link. Use **Invoice + card pay link** when WAAVE keys are on. It does not invent a price. It does not collect a card number. It does not send from Gmail. Open Gmail to send the invoice; that draft CCs Christopher, Aliyah, and the signed-in rep, and includes both addresses plus the wire memo.

## Brand

Every generated invoice uses the same sheet:

- Navy `#0B1F3A` header, banners, table head, and total-due box
- Gold `#C9A227` monogram ring, invoice number, and section labels
- Cream party / terms cards, mint warranty card
- Serif (Times) for the CB seal, invoice number, and “How to Pay”
- Sans (Helvetica / Arial) for company name and body copy

Page 2 is required: ACH / e-check (Lead Bank), domestic wire (add $10 for the incoming fee), and international SWIFT.

## WAAVE keys (optional card link)

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
