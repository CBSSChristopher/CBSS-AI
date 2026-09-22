# ElevenLabs Harbor tools (ZIP quote + ready-to-buy)

Paste these **webhook** tools on Harbor (`agent_5401m358q6x4fwgvqtjvmaspf5dr`) in the ElevenLabs UI. Do **not** wire Cursor MCP into ElevenLabs. Do **not** add SMS or dial tools.

Yard origin (production when Christopher says go): `https://floor.cbshippingsolutions.app`

Auth: header `X-Harbor-Token` = Worker secret `HARBOR_QUOTE_TOKEN` (Bearer is also accepted). Put the token in the ElevenLabs secret header field — never in this repo.

If `ok` is false or `unit_price` is null, **say there is no posted price and do not invent one.**

## `harbor_quote_by_zip`

```json
{
  "type": "webhook",
  "name": "harbor_quote_by_zip",
  "description": "Get a posted CBSS proposal-tool quote from a US ZIP and box needs (size, height, config, grade, qty, delivery or pickup). Speak spoken_summary. If ok is false or reason is no_match, do not invent a price. Never collect payment. This is not a dial.",
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
          "description": "CW, WWT, OneTrip, IICL, AsIs. Default CW."
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
