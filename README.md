# CBSS-AI

Company tools for CB Shipping Solutions.

**The Yard (use this):** `cbss-os/` → https://theyard.cbss.workers.dev

One login for CRM, Desk, Proposal, and Money. Company email only.

Backend workers (do not bookmark these for day-to-day work):

- CRM: `cbss-crm/` → https://cbsscrm.cbss.workers.dev
- Desk: `cbss-brain/` → https://cbssbrain.cbss.workers.dev
- Proposal: `cbss-proposal/` → https://cbsscompletetool.cbss.workers.dev
- Pay: `cbss-pay/` → https://cbsspay.cbss.workers.dev
- Invoice: `cbss-invoice/` → https://cbssinvoice.cbss.workers.dev

**Mark paid → Next Steps:** on the invoice tool and Yard Money list, a company-authenticated rep can Mark paid. The invoice Worker writes paid on the KV card and POSTs `NEXT_STEPS_WEBHOOK_URL` (optional HMAC `NEXT_STEPS_WEBHOOK_SECRET`) so Master Chief can email Next Steps from AgentMail. See `cbss-invoice/README.md`. Set those from the Master Chief routine panel **Yard paid → Next Steps email**.
