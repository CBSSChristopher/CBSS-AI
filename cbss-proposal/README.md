# CBSS Proposal Tool

Live: `https://cbsscompletetool.cbss.workers.dev`

Same company email and CRM password.

## What changed

- Size, grade, and configuration are **desk-style pick buttons** (20STD / 20HC / 40STD / 40HC, WWT / CW / IICL / One-Trip / As-Is, Standard / Double door / Side door OS 2D / Side door OS 4D / Tri-door / Full open side).
- xChange `OS 2D` and `OS 4D` are side-door units. Full open side is a different box and is never priced from an OS 2D/4D row.
- ZIP lookup shows **one depot** and how far it is. **Find depot** and **Pull xChange** sit next to each other.
- A Worker bot refreshes Container Exchange pickup inventory every 10 minutes into KV `xchange-inventory`. Direct Worker fetches hit a Cloudflare challenge, so the bot opens one Browser Rendering session on their inventory page and reads `/api/search` there. Reps can also hit **Pull xChange**.
- Wholesale fills only from a posted `Min_Price` on `/api/search`. City `starting_price` is never used. If xChange posts no match, the box stays blank — do not invent a number.
- The cash figure is **delivered**. The customer PDF does not add a delivery line on top.

Internal copies still show wholesale, the included delivery, and margin.
