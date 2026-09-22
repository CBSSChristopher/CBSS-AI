# Contradictions & resolutions (old Yard vs new sales locks)

| Topic | Older Yard / artifact signal | New sales Harbor lock | Resolution |
| --- | --- | --- | --- |
| SMS / text | Some CTE/email+text culture in human-rep templates; GV text buttons in CRM UI | **Call + email only; no SMS** | **Sales lock wins.** Harbor never texts. Human GV text UI is not Harbor. |
| Closer name | Ready-to-buy sample note once said “Bryan Reese”; other notes mix Brian/Bryan | **Bryan Reese**; default **Christopher Banks** | Use **Bryan Reese** spelling; Christopher default. |
| Brand string | CB Shipping Solutions / CBSS / CB Shipping Solutions variants | Prefer **CB Shipping Solutions (CBSS)** | Customer-facing: **CB Shipping Solutions**. |
| Callback number | Human direct cells / office roster numbers in rep CTE footers | Harbor VM/callback = **870-380-4010** only | Harbor scripts use DID only; roster is for human desk context. |
| Payment | Invoice/Veem/card machine experiments in platform history | **Cards frozen**; wire/ACH/e-check/money order/cashier’s check/cash | **Frozen wins** for Harbor + spoken sales. |
| Dialing | Desk call UI always available to human reps | Harbor outbound **parked until arm** | Humans may use Yard call UI per their rules; **Harbor VA dial stays parked**. |
| Lead intake | Meta webhook experiments appeared in CRM history | **CSV import only** for Harbor VA | CSV path wins for Harbor. |
| Who is Harbor | Staff Grok Bot “Harbor” + sales VA + Yard desk AI branding | Sales/Yard unified desk ≠ staff email bot | Keep staff-comms bot separate from this KB. |
| Price inventing | Proposal tools quote from inventory/zip | Harbor must not invent price on cold talk | Harbor may call `harbor_quote_by_zip` which wraps Yard `POST /quote/match`. If `ok` is false / `no_match`, **no dollar**. Closers still own payment. |
| “New” container | Customer says new; factory-new does not exist on this desk | **New = one-trip / like-new** (grade OneTrip). Used stays used (CW / WWT / IICL / As-Is). | **Sales lock wins.** Say one-trip / like-new. Quote OneTrip when they asked for new. Do not promise factory brand-new. |

If unsure, **new sales locks in 00-identity / payments / product win**.

| Yard system lookup on-call | Desk UI / inventory / health tools exist in Yard history; temptation to “just check” | Harbor must **not** live-look-up yard logistics on the sales call; deflect | **Deflection wins.** See `13-out-of-scope-deflection.md`. Sales script + lead card only; Christopher / Bryan (Brian) / back office after order. |
| ETA / inventory answers | Yard ops docs describe real inventory & scheduling workflows | Harbor never answers delivery timing, availability, scheduling, logistics | Resolved by out-of-scope deflection (cheesy handoff). No guessing. |
