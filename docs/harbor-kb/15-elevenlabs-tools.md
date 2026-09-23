# ElevenLabs Harbor tools (sales-rep workflow)

Paste these **webhook** tools on Harbor (`agent_5401m358q6x4fwgvqtjvmaspf5dr`) in the ElevenLabs UI. Do **not** wire Cursor MCP into ElevenLabs. Do **not** add SMS, dial, or Twilio phone-import tools.

Loop: `get_next_lead` → qualify → `harbor_quote_by_zip` → `update_lead` / `log_outcome` → `harbor_ready_to_buy`. See [15-sales-rep-workflow.md](./15-sales-rep-workflow.md).

Yard origin (production when Christopher says go): `https://floor.cbshippingsolutions.app`

Auth: header `X-Harbor-Token` = Worker secret `HARBOR_QUOTE_TOKEN` (Bearer is also accepted). Put the token in the ElevenLabs secret header field — never in this repo.

If `ok` is false or `unit_price` is null, **say there is no posted price and do not invent one.**

## `get_next_lead`

```json
{
  "type": "webhook",
  "name": "get_next_lead",
  "description": "Pull the next Harbor card like a sales rep. Due follow-ups on Harbor-assigned leads first, then New/Unassigned. New/Unassigned is the global pool. Due follow-ups are Harbor-owner only. Assigns owner Harbor. Never dials. If empty is true, there is no card.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/get-next-lead",
    "method": "POST",
    "request_headers": {
      "Content-Type": "application/json",
      "X-Harbor-Token": {
        "type": "secret",
        "description": "HARBOR_QUOTE_TOKEN on cbssos"
      }
    },
    "request_body_schema": {
      "type": "object",
      "properties": {}
    }
  }
}
```

## `update_lead`

```json
{
  "type": "webhook",
  "name": "update_lead",
  "description": "Write a CRM note on the current card without changing disposition. Use after qualify or quote. Optional cteStage. Never dials. Never SMS.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/update-lead",
    "method": "POST",
    "request_headers": {
      "Content-Type": "application/json",
      "X-Harbor-Token": {
        "type": "secret",
        "description": "HARBOR_QUOTE_TOKEN on cbssos"
      }
    },
    "request_body_schema": {
      "type": "object",
      "required": ["contactId", "note"],
      "properties": {
        "contactId": { "type": "string" },
        "note": { "type": "string", "description": "Qualify / quote notes. Do not invent a price." },
        "cteStage": { "type": "string", "description": "CTE1–CTE4 if you must set it" }
      }
    }
  }
}
```

## `log_outcome`

```json
{
  "type": "webhook",
  "name": "log_outcome",
  "description": "Disposition the card: voicemail, no-answer, answered, soft-delay, not-interested, DNC, wrong-number, bought-elsewhere, ready-to-buy. Advances CTE or sets follow-up. No-answer, voicemail, and soft-delay send the current CTE template live through AgentMail (Reply-To Harbor). Never dials. Never SMS.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/log-outcome",
    "method": "POST",
    "request_headers": {
      "Content-Type": "application/json",
      "X-Harbor-Token": {
        "type": "secret",
        "description": "HARBOR_QUOTE_TOKEN on cbssos"
      }
    },
    "request_body_schema": {
      "type": "object",
      "required": ["contactId", "outcome"],
      "properties": {
        "contactId": { "type": "string" },
        "outcome": {
          "type": "string",
          "description": "voicemail | no-answer | answered | soft-delay | callback | ready-to-buy | not-interested | DNC | wrong-number | bought-elsewhere"
        },
        "note": { "type": "string" },
        "reason": { "type": "string", "description": "Soft-delay reason" },
        "followUpDate": { "type": "string", "description": "YYYY-MM-DD or datetime-local" },
        "closer": { "type": "string", "description": "Christopher Banks or Bryan Reese" }
      }
    }
  }
}
```

## `harbor_quote_by_zip`

```json
{
  "type": "webhook",
  "name": "harbor_quote_by_zip",
  "description": "Get a posted CBSS quote from a US ZIP and box needs (size, height, config, grade, qty, delivery or pickup). While this runs, say the zip wait line. After a hit, speak spoken_summary (patient + size + that grade + that grade’s warranty + fulfillment + dollar). CW and WWT are 5/5. IICL / multi-trip is one grade at 10/10. One-Trip is 10/10 + manufacturer. As-Is has no warranty. Do not upgrade cargo worthy to WWT. Do not say you didn’t make it up or mention the proposal tool or cards. If ok is false or reason is no_match, say you don’t have a posted number — do not invent a dollar. Never collect payment. This is not a dial.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/quote",
    "method": "POST",
    "request_headers": {
      "Content-Type": "application/json",
      "X-Harbor-Token": {
        "type": "secret",
        "description": "HARBOR_QUOTE_TOKEN on cbssos"
      }
    },
    "request_body_schema": {
      "type": "object",
      "required": ["zip"],
      "properties": {
        "zip": {
          "type": "string",
          "description": "5-digit US delivery ZIP"
        },
        "size": {
          "type": "string",
          "description": "10, 20, 40, 45, or 53. Default 40."
        },
        "height": {
          "type": "string",
          "description": "HC or DC. Default HC."
        },
        "config": {
          "type": "string",
          "description": "standard, side-door, double-door, etc. Default standard."
        },
        "grade": {
          "type": "string",
          "description": "CW, WWT, OneTrip, IICL (same grade as multi-trip), AsIs. Default CW (used). If the customer said new, use OneTrip (like-new — not factory brand-new)."
        },
        "qty": {
          "type": "number",
          "description": "How many boxes. Default 1."
        },
        "fulfillment": {
          "type": "string",
          "description": "deliver or pickup. Default deliver."
        },
        "contact_name": {
          "type": "string",
          "description": "Lead name if known"
        },
        "phone": {
          "type": "string",
          "description": "Lead phone if known"
        }
      }
    }
  }
}
```

## `harbor_ready_to_buy`

```json
{
  "type": "webhook",
  "name": "harbor_ready_to_buy",
  "description": "Lead is ready to buy. Warm accounting handoff. Hands to Christopher Banks (default) or Bryan Reese. Writes a CRM note if the contact matches. Emails Christopher and Bryan. Never collect payment. Never SMS. Never dial.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/ready-to-buy",
    "method": "POST",
    "request_headers": {
      "Content-Type": "application/json",
      "X-Harbor-Token": {
        "type": "secret",
        "description": "HARBOR_QUOTE_TOKEN on cbssos"
      }
    },
    "request_body_schema": {
      "type": "object",
      "properties": {
        "quote": {
          "type": "object",
          "description": "Pass through the harbor_quote_by_zip result, or the same ZIP + box fields. Harbor rematches. If rematch fails, do not keep a made-up dollar."
        },
        "zip": {
          "type": "string",
          "description": "5-digit US ZIP if not inside quote"
        },
        "size": { "type": "string" },
        "height": { "type": "string" },
        "config": { "type": "string" },
        "grade": { "type": "string" },
        "qty": { "type": "number" },
        "fulfillment": { "type": "string" },
        "contact_name": { "type": "string" },
        "phone": { "type": "string" },
        "contactId": { "type": "string" },
        "closer": {
          "type": "string",
          "description": "Christopher Banks (default) or Bryan Reese"
        },
        "handoff_variant": {
          "type": "string",
          "description": "accounting, cash-drawer, checkbook, or boxes"
        },
        "objections": { "type": "string" },
        "promises": { "type": "string" },
        "note": { "type": "string" }
      }
    }
  }
}
```

## After paste

1. Christopher sets `HARBOR_QUOTE_TOKEN` on `cbssos`.
2. Paste the same value into both tools’ `X-Harbor-Token` secret header.
3. Leave Twilio outbound **parked**. These tools do not arm `VA_DIAL_ARMED`.
4. Dry-run the tool from ElevenLabs against a known ZIP. If `ok` is false, Harbor must say it has no posted number.
