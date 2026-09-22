import { normalizeVaOutcome } from "./outcomes.ts";
import { emptyCapture, type VaCapture, type VaSource } from "./store.ts";

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function joinTranscript(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map((row) => {
      const item = rec(row);
      const who = str(item.role || item.speaker || item.user_id);
      const text = str(item.message || item.text || item.content);
      return [who, text].filter(Boolean).join(": ");
    })
    .filter(Boolean)
    .join(" / ");
}

function detectSource(payload: Record<string, unknown>): VaSource {
  const raw = str(payload.source || payload.vendor).toLowerCase();
  if (raw === "elevenlabs" || raw === "twilio" || raw === "manual") return raw;
  if (payload.conversation_id || payload.conversationId || rec(payload.data).conversation_id) return "elevenlabs";
  if (payload.CallSid || payload.CallStatus || payload.AccountSid) return "twilio";
  return "unknown";
}

/** Accepts our canonical JSON, ElevenLabs post-call, or a thin Twilio status wrapper. */
export function parseVaWebhookPayload(payload: Record<string, unknown>): { ok: true; capture: VaCapture } | { ok: false; error: string } {
  const data = rec(payload.data);
  const analysis = rec(payload.analysis || data.analysis);
  const meta = rec(payload.metadata || data.metadata);
  const phoneCall = rec(meta.phone_call || meta.phoneCall || payload.phone_call);
  const nested = Object.keys(data).length ? data : payload;

  const conversationId = str(
    payload.conversationId || payload.conversation_id || nested.conversation_id || nested.conversationId,
  );
  const callId = str(payload.callId || payload.call_id || payload.CallSid || nested.call_id || conversationId);
  const from = str(
    payload.from ||
      payload.From ||
      phoneCall.external_number ||
      phoneCall.from ||
      nested.from,
  );
  const to = str(payload.to || payload.To || phoneCall.agent_number || phoneCall.to || nested.to);
  const phone = str(payload.phone || from);
  const outcome = normalizeVaOutcome(
    payload.outcome ||
      nested.outcome ||
      analysis.call_outcome ||
      analysis.outcome ||
      payload.CallStatus,
  );
  if (!outcome) {
    return { ok: false, error: "Need a call outcome (no-answer, gatekeeper, not-interested, callback, booked, DNC, wrong-number)." };
  }
  if (!callId && !phone) {
    return { ok: false, error: "Need a call id or a phone number." };
  }

  const transcript = joinTranscript(payload.transcript || nested.transcript) || str(payload.text);
  const summary = str(
    payload.summary || analysis.transcript_summary || analysis.summary || nested.summary,
  );

  return {
    ok: true,
    capture: emptyCapture({
      id: str(payload.id) || callId || conversationId,
      source: detectSource(payload),
      callId: callId || conversationId,
      conversationId,
      from,
      to,
      phone,
      contactId: str(payload.contactId || payload.contact_id || nested.contactId),
      contactName: str(payload.contactName || payload.contact_name || payload.name || nested.contactName),
      outcome,
      durationSec: Number(payload.durationSec || payload.duration_sec || payload.CallDuration || nested.duration_sec) || 0,
      transcript,
      summary,
      bookedAt: str(payload.bookedAt || payload.booked_at || nested.bookedAt),
      closer: str(payload.closer),
    }),
  };
}
