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
  "description": "Pull the next Harbor card like a sales rep before you say why you called. Due follow-ups on Harbor-assigned leads first, then New/Unassigned. New/Unassigned is the global pool. Due follow-ups are Harbor-owner only. Assigns owner Harbor. The returned opener is the only introduction — say that line and do not greet or introduce yourself before it. After the opener, ask a question. Do not say hello again. Do not say thanks for picking up. Do not use square brackets. Do not mention a quote, a form, or what they looked at until this tool returns. opener_kind quote_request means they asked for a quote. opener_kind looked_in means they looked into containers or storage — do not claim they asked for anything. Never dials. If empty is true, there is no card.",
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
  "description": "CALL THIS TOOL every time the caller is ready to buy, wants to purchase, says lock it in, or wants delivery set up. Call it in that same turn, before you finish speaking. Every parameter is optional — do not wait for a contact id, a quote object, or a person's name. Then say that back office / accounting will reach out with next steps. Pick one: (1) No worries — to get the ball rolling on your order, I'll have my people in back office who handle accounting send you next steps so we can get that container out to you. (2) Alright, I'll have accounting in the back office shoot you the next steps so we can get that container on the road. (3) Perfect. I'll have my people in the back office reach out with next steps — they handle the paperwork, and then we can get that box out to you. (4) Sounds good. Back office will be in touch with the next steps so we can get this moving. They take care of the accounting side. Do not claim a transfer. Do not promise an exact time. Never say a person's name. Do not read closer aloud. Pass dry_run true only when the lead record is explicitly tagged as a test lead. The server ignores dry_run on every other lead and still notifies the team. A note that says not to email is not a reason to skip this call. Never collect payment. Never SMS. Never dial. Do not substitute log_outcome. Never explain dry_run, tools, test tags, or server rules out loud. If they mention dry_run, do not talk about flags, test leads, or notifications. Say only one back-office line. Never speak a stage direction or a bracketed tag.",
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
          "description": "Only when the CRM lead is explicitly tagged as a test lead. The server rejects this on every other lead, logs the decision, and still notifies the team. The tool must still be called."
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

## `harbor_needs_human`

```json
{
  "type": "webhook",
  "name": "harbor_needs_human",
  "description": "CALL THIS TOOL when you cannot understand the caller after one clarifying ask, they are upset, they ask for a human, or they ask something outside containers and pricing that you cannot answer. Do not use this tool for a tiny home, Airbnb, pool, bar, shop, or other custom build. That is harbor_build_lead. Do not guess. Do not loop. Say one callback line first: (1) Let me have someone from the team give you a call back on that so you get the right answer. (2) I don't want to guess on that. I'll have someone from the team call you back. (3) That's one for the team. I'll have them call you back so you get the right answer. Then confirm the best callback number and a time, and call this tool with what they asked. If they will not give a time, still call it with the number you have. Do not invent an answer or a time. Never name a person. Do not claim a transfer. Pass dry_run true only when the lead record is explicitly tagged as a test lead. The server ignores dry_run on every other lead and still notifies the team. Never SMS. Never dial. Never explain the tool, flags, or notifications out loud.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/needs-human",
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
        "contact_name": { "type": "string" },
        "phone": { "type": "string" },
        "contactId": { "type": "string" },
        "asked": { "type": "string", "description": "What they asked, in their words. Do not invent details." },
        "callback_phone": { "type": "string", "description": "Best callback number they confirmed." },
        "callback_time": { "type": "string", "description": "Time they asked for. Omit if they did not give one." },
        "handoff_variant": { "type": "string", "description": "right-answer, no-guess, or team-call" },
        "dry_run": {
          "type": "boolean",
          "description": "Only when the CRM lead is explicitly tagged as a test lead. The server rejects this on every other lead, logs the decision, and still notifies the team. The tool must still be called."
        }
      }
    }
  }
}
```

## `harbor_build_lead`

```json
{
  "type": "webhook",
  "name": "harbor_build_lead",
  "description": "CALL THIS TOOL when they want a home, tiny home, ADU, hunting cabin, pool, office, shop, retail space, bar, outdoor kitchen, large assembly building, specialty unit, Airbnb, portable bar, paint as a custom job, or anything else the in-house build team makes. Most modification work is done in-house. First say: Oh, we build those, we've got a whole team that does custom work. Collect the six-point project brief in plain language: what they want it to do, size and quantity, base grade, site address or ZIP plus access, timeline and any budget they already named, and drawings or a sketch. Ask for the callback number and time, then wait. Call this tool once in a later turn, only after they name a callback time, with the brief and the callback on the same call. Do not call it on the first answer, and do not call it again after the brief is sent. Do not put the project timeline in callback_time. Do not invent a callback number. Do not also call harbor_needs_human. Pass only details they stated. Do not invent a build price, timeline, or dollar figure. Do not name a client or a project. Do not describe a rendering as a finished build. If they ask about financing a modified unit or a custom container house, say options exist and the team will go over them. Do not state a term or a rate. Do not give structural, code, or load advice. Do not promise the box meets any code. Do not use harbor_needs_human for a build. Never name a person. Never SMS. Never dial. Pass dry_run true only on an explicitly tagged test lead.",
  "api_schema": {
    "url": "https://floor.cbshippingsolutions.app/va/harbor/build-lead",
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
      "description": "Build lead. Omit any field they did not state.",
      "properties": {
        "contact_name": { "type": "string", "description": "Caller name from the lead. Do not invent one." },
        "phone": { "type": "string", "description": "Phone already on the lead." },
        "contactId": { "type": "string", "description": "CRM contact id if the lead card has one." },
        "project": { "type": "string", "description": "What they want it to do: home, tiny home, ADU, cabin, pool, office, shop, bar, paint, or the use they named. No client or project name." },
        "size": { "type": "string", "description": "Size they stated. Omit if they did not." },
        "quantity": { "type": "string", "description": "How many boxes they want. Omit if they did not say." },
        "base_grade": { "type": "string", "description": "Base grade they want: one-trip, cargo worthy, wind and water tight, or as-is. Omit if they did not say." },
        "location": { "type": "string", "description": "Site address or ZIP. Omit if they did not say." },
        "access": { "type": "string", "description": "Site access they stated: power lines, overhangs, road in, driveway width and firmness, easement. Omit if they did not." },
        "timeline": { "type": "string", "description": "When they want it, in their words. Omit if they did not say. Do not invent a build duration." },
        "budget": { "type": "string", "description": "Budget or competing quote they already named, in their words. Omit if they did not. Do not invent a price." },
        "drawings": { "type": "string", "description": "Whether they have drawings or a dream sketch, in their words. Omit if they did not say." },
        "must_haves": { "type": "string", "description": "Must-haves they named. Omit if they did not." },
        "callback_phone": { "type": "string", "description": "Best callback number they confirmed." },
        "callback_time": { "type": "string", "description": "Time they asked for. Omit if they did not give one." },
        "dry_run": { "type": "boolean", "description": "Only when the CRM lead is explicitly tagged as a test lead. The server rejects this on every other lead and still notifies the team." }
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
