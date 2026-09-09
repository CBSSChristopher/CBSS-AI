# Next Steps PDF

Expected file: `CBSS-Next-Steps-After-Your-Order.pdf`

This Worker attaches that guide on **Mark paid** from AgentMail inbox `cbss@agentmail.to`. It does **not** go through Master Chief, Grok Bot, Gmail, or a webhook.

## Runtime attachment

1. Preferred: set a public URL the AgentMail API can fetch (no auth cookies):

   ```
   npx wrangler secret put NEXT_STEPS_PDF_URL
   ```

   The send uses AgentMail's `attachments[].url` field (see https://www.agentmail.to/docs/api-reference/inboxes/messages/send).

2. Until the file is supplied, Mark paid still emails the approved body and records that the PDF was not attached.

3. Drop the canonical PDF here as `cbss-invoice/assets/CBSS-Next-Steps-After-Your-Order.pdf` when Christopher provides it. `GET /assets/next-steps.pdf` (signed in) proxies `NEXT_STEPS_PDF_URL` or returns 404 with this path.

Do not commit secrets. Do not host the PDF behind cookie auth if AgentMail must download it.
