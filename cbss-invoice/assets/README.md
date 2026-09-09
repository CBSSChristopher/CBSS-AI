# Next Steps PDF

Canonical file: `CBSS-Next-Steps-After-Your-Order.pdf`

This Worker attaches that guide on **Mark paid** from AgentMail inbox `cbss@agentmail.to`. It does **not** go through Master Chief, Grok Bot, Gmail, or a webhook.

## Runtime attachment

The send uses AgentMail's standalone file shape only:

- `filename`: `CBSS-Next-Steps-After-Your-Order.pdf`
- `content_type`: `application/pdf`
- `content`: base64 of the PDF bytes
- `content_disposition`: `attachment`

It does **not** send `attachments[].url`. `NEXT_STEPS_PDF_URL` is deprecated and is ignored for attach even if the secret is still set.

Bytes are loaded at send time from this file (Worker `ASSETS` binding or local disk). If the file is missing, the Worker renders the same branded guide so the email still carries a PDF. The body never depends on a link to the file.

Regenerate the committed file after copy changes:

```
node --experimental-strip-types scripts/write-next-steps-pdf.mjs
```

`GET /assets/next-steps.pdf` (signed in) returns the bundled bytes. It is not a public URL for AgentMail.
