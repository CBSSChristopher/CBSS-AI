# ZIP → proposal tool quote (Harbor)

Christopher’s north star: **on-call ZIP + box needs → CBSS proposal tool quote → ready-to-buy notifies Christopher Banks (default) + Bryan Reese.** Cards stay frozen. Harbor never collects payment.

Existing match logic lives on The Yard (`cbssos`): session `POST /quote/match` and `GET /geo/zip`. Harbor **wraps that same match**. It does not invent wholesale or a customer price.

Proposal worker (never invent numbers from this URL): `https://cbsscompletetool.cbss.workers.dev`

## Tools

| Tool | Yard route | Auth |
| --- | --- | --- |
| `harbor_quote_by_zip` | `POST /va/harbor/quote` | `X-Harbor-Token` or `Authorization: Bearer` === secret `HARBOR_QUOTE_TOKEN` |
| `harbor_ready_to_buy` | `POST /va/harbor/ready-to-buy` | same token |

Christopher must set the Worker secret (placeholder only — never commit the value):

```
npx wrangler secret put HARBOR_QUOTE_TOKEN
```

on `cbssos`. Inventory + CRM writes still use `VA_CRM_EMAIL` / `VA_CRM_PASSWORD` (same service login as other Harbor agent routes).

## `harbor_quote_by_zip`

Reuses `/quote/match` fields:

| Field | Required | Default |
| --- | --- | --- |
| `zip` | yes (5-digit US) | — |
| `size` | no | `40` |
| `height` | no | `HC` |
| `config` | no | `standard` |
| `grade` | no | `CW` (used cargo-worthy). If they said **new**, send `OneTrip` (like-new — not factory brand-new). Used stays used. |
| `qty` | no | `1` |
| `fulfillment` | no | `deliver` (`pickup` allowed) |
| `refresh` | no | `false` (same as session match) |
| `contact_name` | no | logged only |
| `phone` | no | logged only |

**Match:** Zippopotam ZIP → posted xChange inventory on the proposal worker → `matchPostedBox` (same helper as `/quote/match`). Cash `unit_price` is the Yard ticket formula (posted wholesale + delivery rate-sheet + standard margin, rounded to $25). If wholesale is missing, Harbor returns **no price**.

**Success**

```json
{
  "ok": true,
  "spoken_summary": "Posted CBSS quote for ZIP 72201 … is $3,250. …",
  "unit_price": 3250,
  "box": { "size": "40", "height": "HC", "grade": "CW", "wholesale": 1850 },
  "place": "Little Rock, AR",
  "zip": "72201",
  "dialing": false,
  "sms": false
}
```

Speak `spoken_summary`. Do not invent a second number.

**No match** — HTTP 200, `ok: false`, `reason: "no_match"`, `unit_price: null`. Never invent a price.

**Bad ZIP** — HTTP 400 (`Type a 5-digit ZIP.` / unknown ZIP). Still no invented price.

**Quote ≠ dial.** This route never places a PSTN call. `VA_DIAL_ARMED` still has to be true (and Christopher still has to say **arm**) before any outbound dial. Quote is safe while dial stays parked.

## `harbor_ready_to_buy`

Body: prior `quote` (or the same ZIP + box fields) + contact (`contact_name` / `phone` / `contactId`) + `closer` (`Christopher Banks` default, or `Bryan Reese`) + `handoff_variant` (`accounting` / `cash-drawer` / `checkbook` / `boxes`).

Harbor:

1. Re-runs the same posted match when ZIP is present — if rematch fails, price on the note is **not stated** (do not keep a hallucinated dollar).
2. Writes a CRM ready-to-buy note **if** the contact matches (phone, then email, then id). Stage / owner follow the existing Harbor handoff (Christopher or Bryan).
3. Notifies **Christopher Banks + Bryan Reese** on the existing Yard email / in-Yard alert path (`sendAgentMail` + `pushAlert`). **No SMS.**
4. Speaks the warm accounting handoff. Cards frozen. Harbor does not collect payment. The spoken transfer does not name Christopher Banks or any specific person. Call this tool at that moment, every time.
5. **Dry run / spoken test:** body `dry_run: true` (or `dryRun: true`) still counts as the tool firing, and skips the CRM write, the closer email, and the in-Yard alert. A real buyer omits `dry_run`, and the notify path above runs. This route still never dials and never sends SMS. `VA_DIAL_ARMED` stays false.

## Deflection boundary (unchanged)

Logistics, ETAs, live yard stock, trucking, crane, and scheduling stay **out of scope**. ZIP quote is only a **posted proposal-tool match**. If they ask “when can you deliver” or “do you have one sitting on the yard today,” use [13-out-of-scope-deflection.md](./13-out-of-scope-deflection.md). Do not turn a quote into an ETA.

## Locks

- Never invent wholesale or `unit_price`.
- Never collect payment. Cards frozen.
- Never SMS.
- Never dial from these tools.
- No MCP Cursor-into-ElevenLabs. Paste tools from [15-elevenlabs-tools.md](./15-elevenlabs-tools.md) in the ElevenLabs UI only.
