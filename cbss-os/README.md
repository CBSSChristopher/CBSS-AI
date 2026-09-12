# The Yard

The floor CRM for CB Shipping Solutions. One login for CRM, Desk, Proposal, Modified, and Money.

Bookmark: `https://floor.cbshippingsolutions.app`

Company email only. Same password as the CRM.

The older single-tool URLs still run as backends. This worker does **not** deploy over them. Work the book from The Yard.

- CRM `https://cbsscrm.cbss.workers.dev`
- Desk `https://cbssbrain.cbss.workers.dev`
- Proposal `https://cbsscompletetool.cbss.workers.dev`
- Pay `https://cbsspay.cbss.workers.dev`
- Invoice `https://cbssinvoice.cbss.workers.dev`

Navy `#0B1F3A` / gold `#C9A227` / cream `#F7F4EC`.

## Modules

- **CRM** — contacts, follow-ups, tasks, pipeline, notes, email-campaign hold
- **Desk** — Harbor (CBSS AI) first, Container One / USA Containers price match, then call scraps and email
- **Proposal** — stepped quote: pick the box, Get CBSS Price, proposal amount, submit
- **Modified** — build-out spec: Apex helical pylons, doors, roll-up, windows, framing, insulation, electrical. No invented prices
- **Money** — branded invoice (ACH/wire or card). Mark paid records the KV card; the invoice Worker emails Next Steps from AgentMail. No Veem. No Master Chief webhook.
- **Lifecycle / CTE** — New → Working → Quoted → Invoiced → Paid → Delivered (exits: Lost, Not interested, Bought elsewhere). Contact card shows assigned rep, CTE stage, next due, compact timeline, Logged attempt / No answer / Replied / Override CTE / Mark paid.

## Hard rules

- Company email only `@cbshippingsolutions.com`
- Do not invent a price or wholesale
- Do not mix Side door OS 2D / OS 4D / Full open
- Do not send Gmail from this tool
- Do not change the five live backend workers from this folder

## Autonomous CTE + AgentMail

Workers own the ladder. Grok Bot / Master Chief / AgentMail MCP are not used at runtime.

- Secret: `AGENTMAIL_API_KEY`. Inbox var: `AGENTMAIL_INBOX=cbss@agentmail.to`.
- Cron: `0 * * * *`. Sends only 08:00–19:00 America/Chicago. Each `contactId:template` send is idempotent.
- CTE1 = human call/text day. **No answer** sends a short introduction (who we are, reply or call) with the assigned rep's name, title, company email, and phone on the footer. CTE2/3/4 keep that same footer. Schedules CTE2 +1, CTE3 +3, CTE4 +7 business days from the CTE1 date (weekends + U.S. federal holidays for any year; optional `US_HOLIDAY_EXTRA=YYYY-MM-DD,YYYY-MM-DD`).
- **Replied** (button) or inbound AgentMail reply (webhook `POST /cycle/hooks/agentmail` with `AGENTMAIL_WEBHOOK_SECRET`, plus hourly poll) cancels remaining sends and writes `Client replied · Ladder stopped`. System-detected replies alert the **current** assigned rep only (in-Yard + AgentMail).
- Override CTE sets the next unsent step; later steps keep the original gaps. Reply-stop always wins.
- Assigned rep for **CTE** emails comes from the contact owner matched to an active Yard login (`cycle:users`). Missing / inactive rep or missing client email pauses CTE and flags — never invents an email for an unknown name.
- **Paid / Next Steps** still sends when the assigned rep has no Yard login. Require a real client email. Always CC Christopher and Aliyah. CC/reply-to the rep only when resolved: first an active Yard login, else a known CBSS roster address (James → `james@cbshippingsolutions.com`, Kyle → `kyle@…`, and the other `TEAM_OWNERS` first-name company emails). Unknown owners are not guessed — office CC still goes out. Missing client email writes a clear note, does not send, and does not report success. Send is once-only (`sends.paid.status === "sent"`).
- Reassignment keeps history; future touches and alerts go to the new rep.
- Lost / Not interested / Bought elsewhere write trigger hooks and named templates. Sending stays off until `REENGAGE_EMAILS_ENABLED=true`.
- Paid Next Steps: invoice Worker sends once after Money **Mark paid** (To client; CC Christopher, Aliyah, current rep). Yard Money then records Paid on the cycle with `skipEmail` so the client is not mailed twice. Lifecycle **Mark paid** / **Retry Next Steps** on the contact still sends if no successful send has been recorded. Already-sent paid mail is skipped (no double send).

### Retry Next Steps (example: Brent Snyder)

After deploy, Christopher can retry a Paid contact that never got the email (AgentMail inbox stayed empty; notes said “Assigned rep has no active Yard login”):

1. Open The Yard → CRM → that contact (Brent Snyder). Confirm the contact has a real client email.
2. On the Lifecycle card, if status is already **Paid** and Next Steps is not marked sent, click **Retry Next Steps**. That calls `POST /cycle/paid` without `skipEmail`. If `sends.paid.status` is already `sent`, the Worker skips and does not mail again.
3. If the Lifecycle **Mark paid** button is still visible (status not Paid yet), click it once. Same once-only send.
4. Use Money **Retry Next Steps** / **Mark paid** only when the invoice card itself shows “Paid but Next Steps notify failed — retry”. Do not also click Lifecycle retry on the same contact after a successful invoice send — invoice owns that mail (`skipEmail` on the cycle).
5. Confirm in AgentMail inbox `cbss@agentmail.to` and on the contact timeline: `Sent paid via AgentMail (…)` plus office CC. Do not blast Harbor / staff chat.
- Next Steps PDF: real binary `cbss-invoice/assets/CBSS-Next-Steps-After-Your-Order.pdf` (~1.36MB), attached as AgentMail `content` (base64). `NEXT_STEPS_PDF_URL` is not used. Missing file does not invent a PDF. Brent **Retry Next Steps** / Lifecycle **Mark paid** use the same payload.
- Staff cycle actions also `appendNote` to CRM (tag Book). Cron events live on the contact cycle timeline in Yard KV.

Register the inbound webhook (after the secret exists):

```
POST https://api.agentmail.to/v0/webhooks
{ "url": "https://floor.cbshippingsolutions.app/cycle/hooks/agentmail", "event_types": ["message.received"], "inbox_ids": ["cbss@agentmail.to"] }
```

Store the returned `whsec_…` as `AGENTMAIL_WEBHOOK_SECRET` on `cbssos`. Hourly poll still runs if the hook is missing.
