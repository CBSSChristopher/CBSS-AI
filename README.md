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

**Yard sales cycle (autonomous):** Cloudflare Workers own scheduling and sends. The Yard cron (`0 * * * *`, America/Chicago business hours) plus AgentMail REST (`AGENTMAIL_API_KEY`, inbox `cbss@agentmail.to`) run CTE follow-ups and Paid Next Steps even if Grok Bot / Master Chief usage is maxed. No runtime Gmail, AgentMail MCP, or Master Chief webhook. See `cbss-os/README.md` and `cbss-invoice/README.md`.

```
# both workers
npx wrangler secret put AGENTMAIL_API_KEY
# optional
npx wrangler secret put AGENTMAIL_WEBHOOK_SECRET   # cbssos only, inbound reply hook
```

Paid Next Steps attaches the real `cbss-invoice/assets/CBSS-Next-Steps-After-Your-Order.pdf` (~1.36MB) as AgentMail `content` (base64). Do not invent a PDF. Do not use `NEXT_STEPS_PDF_URL` for attach.

**Outbound sales VA (parked):** `cbss-os/docs/outbound-sales-va/`. ElevenLabs → Twilio → `POST /va/hooks/outbound` → CRM `appendNote`. Harbor does not buy accounts, dial, or send customer email. `VA_ENABLED` / `VA_DIAL_ARMED` stay false until Christopher says go. This is not the Harbor staff-comms Grok Bot.
