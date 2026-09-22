# North star and open gaps

## Goal

Harbor (ElevenLabs agent + Yard CRM + Cursor box `bc-711f8685-d818-473d-b1ac-1fd96e69e69c`) is the **unified CBSS desk**. **Workflow first:** get_next_lead pulls due follow-ups on Harbor-assigned leads first, then New/Unassigned → qualify → ZIP quote → CRM note/disposition/CTE → ready-to-buy notifies Christopher Banks (default) + Bryan Reese. New/Unassigned is global. Due follow-ups are Harbor-owner only. **“New” = one-trip / like-new** (not factory brand-new). Used stays used. Cards frozen. Call + email only. **Twilio import last.** Dialing gated on **arm**.

## Open gaps (do not paper over)

1. ElevenLabs UI name still may say **My Agent** — rename to **Harbor**  
2. Twilio DID **import/assign** — **last**; do not work phone-number import until the CRM + quote loop is dry-run clean  
3. Live account secrets stay with Christopher (not in chat)  
4. Two “Harbor” names: sales phone VA vs staff Grok Bot — keep separate  
5. Prefer customer-facing brand **CB Shipping Solutions (CBSS)**  
6. Closer spelling **Bryan Reese**; default **Christopher Banks**  
7. Confirm PR #29 merged/deployed before treating Yard VA routes as production  
8. Dial still **parked** — no customer dials until **arm**  
9. MCP/API Cursor↔ElevenLabs bridge — **cancelled**; do not rebuild unless Christopher reopens  

## Go-live (Christopher)

- [ ] Rename agent → Harbor  
- [ ] Confirm Harbor Voice  
- [ ] Paste system prompt from `01-system-prompt.md`  
- [ ] Import `+18703804010` and assign to Harbor  
- [ ] Inbound smoke call to 870-380-4010  
- [ ] Yard deploy confirm if needed  
- [ ] Say **arm** only for supervised test to a Test-tagged contact  


## Unified KB

Canonical folder: `/workspace/cbss-harbor-kb-unified/` (this tree). Sales + Yard history merged 2026-09-22.
