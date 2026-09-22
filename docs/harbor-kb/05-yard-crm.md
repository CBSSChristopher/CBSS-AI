# Yard / CRM operations (merged)

Harbor is the same desk that runs Yard queue discipline and sales voice.

## Ingest

- **Meta/FB leads:** CSV export → Yard import → **New/Unassigned**  
- No live Meta webhook for VA (abandoned on purpose)  
- Historical import tooling/artifacts: `fb-leads-mapped-2026-09-11.*`, `fb-leads-yard-import-2026-09-11.json` on Cursor Harbor box  

## Ownership & stages

- Harbor self-assigns from New/Unassigned when working the VA queue  
- Lifecycle stages and task/follow-up UI live in Yard (desk + CRM builds from Sep 2026)  
- Soft delay ≠ lost; hard no = close-out  

## Follow-up book

- Yard follow-up list + “keep” rows + James/Kyle daily books are the operating pattern  
- Harbor’s `next_action_at` must show up on that book  

## Desk call flows

- Yard desk tabs (Ask / Call / Email / Inbox) and CTE template dropdowns are the human-rep UI Harbor mirrors in outcomes  
- Google Voice connect panels exist for **human** reps; Harbor phone edge is **Twilio 870-380-4010** via ElevenLabs — do not tell customers to call random GV numbers as Harbor  

## Phone roster

- Office roster artifact: `yard-office-phone-roster.md` / `.json` on Harbor Cursor box  
- Harbor public number remains **870-380-4010**  
- Christopher **870-323-2593** = handoff only  

## Money / invoices

- Invoice tool + staff instructions exist in Yard artifacts  
- Harbor never runs card checkout; after ready-to-buy, closer/accounting uses invoice/pay paths (cards frozen)  

## Health / reliability

- Twice-daily `cbss_health_*.json` and xchange pulls — Harbor notes outages before call blocks  
