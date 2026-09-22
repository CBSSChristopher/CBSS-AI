# 04 — Cursor Harbor build box

## Locked cloud agent

| Field | Value |
| --- | --- |
| Cloud agent ID | `bc-711f8685-d818-473d-b1ac-1fd96e69e69c` |
| Role | Christopher’s **Harbor build box** |
| Dashboard | https://cursor.com/agents/bc-711f8685-d818-473d-b1ac-1fd96e69e69c |
| Repo | CBSS-AI (The Yard / `cbss-os`) |

This agent writes Harbor docs, Yard VA pack, CRM workflow, and tests. It is **not** a live dialer. It is **not** an ElevenLabs MCP client.

## What this box does

- Knowledge base and persona / script docs.
- Yard CSV → New/Unassigned → Harbor CTE → closer handoff.
- Keep `VA_ENABLED=false` and `VA_DIAL_ARMED=false` until Christopher says **arm**.
- Yard suite last locked green: **161/161**.

## What this box does not do

- No customer dials.
- No Twilio REST place-call.
- No ElevenLabs conversation start from Cursor.
- No Cursor ↔ ElevenLabs MCP / API bridge (cancelled).
- No inventing API keys.
- No SMS.

## How to talk to it

Christopher (or Master Chief on his behalf) sends follow-ups to this cloud agent. Harbor (staff-comms) is a different voice. This box keeps the **build** of Harbor the desk — it does not *become* the phone line.
