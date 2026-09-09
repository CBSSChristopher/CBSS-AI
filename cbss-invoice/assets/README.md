# Next Steps PDF

Canonical file (required): `CBSS-Next-Steps-After-Your-Order.pdf` (~1.36MB real binary).

Master Chief: drop that exact file here. Do not invent a substitute. Do not attach by URL.

This Worker attaches that guide on **Mark paid** from AgentMail inbox `cbss@agentmail.to` as:

- `filename`: `CBSS-Next-Steps-After-Your-Order.pdf`
- `content_type`: `application/pdf`
- `content`: base64 of the PDF bytes
- `content_disposition`: `attachment`

`NEXT_STEPS_PDF_URL` is ignored. If the file is missing, the email body still sends and a clear note is logged. The body does not depend on a link to the PDF.

`cbss-os` uses the same file via its `ASSETS` binding (`../cbss-invoice/assets`).
