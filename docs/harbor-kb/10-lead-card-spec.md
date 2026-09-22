# Lead card spec (single standard)

Every Harbor touch — ingest, dial, CTE, handoff — uses **one** lead card. Derived from Yard CRM contact + FB/Meta CSV import fields + sales VA outcome notes.

## Required fields

| Field | Rules |
| --- | --- |
| `contact_id` | Yard CRM id when known |
| `full_name` | First + last |
| `company` | Business name; if blank, confirm on call |
| `phone` | E.164 preferred; digits for match |
| `email` | Optional but preferred for email channel |
| `source` | e.g. `facebook_lead_ads`, web, inbound, referral, manual |
| `stage` | Yard lifecycle stage (New/Unassigned → Working → …) |
| `owner` | `Harbor` while on VA queue; Christopher/Bryan after ready-to-buy handoff; or named rep if already assigned |
| `cte_step` | `none` / `CTE1`…`CTE4` |
| `product_interest` | Size/type/condition if known (e.g. 20STD WWT, 40HC) — **never invent** |
| `use_case` | Business jobsite / storage / farm / etc. |
| `delivery_or_pickup` | Delivery city/state or pickup |
| `timing` | When they need it |
| `quoted_price` | Only if already quoted on card; else empty |
| `last_outcome` | Disposition label |
| `next_action_at` | ISO date for soft-delay / CTE due |
| `notes` | Append-only timeline |
| `dnc` | true/false |
| `cards_frozen_reminder` | Always true for Harbor |

## Optional / import-mapped (from FB lead history)

- Ad name / campaign  
- ZIP / city / state  
- Form answers (container size, delivery need)  
- Created_time  

## Ready-to-buy handoff block (required on that outcome)

Must include: spoken variant used; closer (`Christopher Banks` or `Bryan Reese`); size/type/condition; delivery/pickup; objections; soft promises; exact price if stated; payment path = cards frozen (wire/ACH/e-check/money order/cashier’s check/cash).

## Card states Harbor cares about

1. **New/Unassigned** — pull & self-assign  
2. **Harbor Working** — on CTE or soft-delay  
3. **Ready to buy** — owned by closer; Harbor stops collecting  
4. **Closed / Lost / DNC** — no further Harbor dials  

## Anti-patterns

- Dialing with no phone or DNC true  
- Writing SMS tasks  
- Putting 870-323-2593 on the card as customer callback  
- Inventing inventory or price into `product_interest` / `quoted_price`  
