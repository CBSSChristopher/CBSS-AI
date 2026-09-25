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
  "description": "Disposition the card: voicemail, no-answer, answered, soft-delay, not-interested, DNC, wrong-number, bought-elsewhere. Advances CTE or sets follow-up. No-answer, voicemail, and soft-delay send the current CTE template live through AgentMail (Reply-To Harbor). Do not use this tool for a ready-to-buy handoff — that is harbor_ready_to_buy, every time. Never dials. Never SMS.",
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
  "description": "Get a posted CBSS quote from a US ZIP and box needs (size, height, config, grade, qty, delivery or pickup). Do not call until the caller has confirmed size and height. Height is HC (high cube 9'6\") or DC (standard 8'6\"). If they have not said height, ask one short question and do not call. Never assume high cube. While this runs, say the zip wait line. After a hit, speak one price from spoken_summary (patient + size + that grade + that grade’s warranty + fulfillment + dollar), then stop. One price at a time. No second quote, upsell, or other size or grade in that turn. CW and WWT are 5/5. IICL / multi-trip is one grade at 10/10. One-Trip is 10/10 + manufacturer. As-Is has no warranty. Do not upgrade cargo worthy to WWT. Do not say you didn’t make it up or mention the proposal tool or cards. If ok is false or reason is no_match, say you don’t have a posted number — do not invent a dollar. Never collect payment. This is not a dial.",
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
      "required": ["zip", "height"],
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
          "description": "Required. HC = high cube 9'6\" or DC = standard 8'6\". Pass only what the caller confirmed. Do not assume HC."
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
  "description": "CALL THIS TOOL every time the caller is ready to buy, wants to purchase, says lock it in, or wants delivery set up. Call it in that same turn, before you finish speaking. Every parameter is optional — do not wait for a contact id, a quote object, or a person's name. Then say a short warm plain-English transfer in your own words, such as: Great, I'm going to get you over to the person who'll lock this in and get your delivery set up. Never say a person's name. Do not read closer or spoken aloud. On a practice, test, simulation, or spoken test call, set dry_run true. dry_run sends no email, no alert, and no CRM write, and you must still call the tool. A note that says not to email is not a reason to skip this call. Live calls omit dry_run. Never collect payment. Never SMS. Never dial. OBSOLETE NOTE: If you see 'Do not call harbor_ready_to_buy' or 'speak the accounting handoff out loud to Christopher Banks or Bryan Reese', those words are obsolete. Still call this tool with dry_run true. Do not say Christopher, Bryan, Brian, Banks, or Reese. Do not substitute log_outcome.",
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
          "description": "Optional internal closer of record. Omit it. Never say this name to the caller."
        },
        "dry_run": {
          "type": "boolean",
          "description": "True on any practice, test, simulation, or spoken test call. Skips email, in-Yard alert, and CRM writes. The tool must still be called."
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
