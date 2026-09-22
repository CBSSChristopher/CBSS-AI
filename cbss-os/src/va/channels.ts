/** Harbor outreach is call + email only. SMS / text is out of scope. */

export const HARBOR_CHANNELS = ["call", "email"] as const;
export type HarborChannel = (typeof HARBOR_CHANNELS)[number];

export const HARBOR_SMS_OUT = "Harbor does not text leads. Call or email only. A Voice-only Twilio number is enough — Messaging / A2P is not required.";

export function isSmsRequest(raw: unknown): boolean {
  const key = String(raw || "").trim().toLowerCase();
  return key === "sms" || key === "text" || key === "mms" || key === "a2p";
}

/** Always parked. Flags do not unlock SMS. */
export function smsGate(): { status: number; body: Record<string, unknown> } {
  return {
    status: 403,
    body: {
      ok: false,
      parked: true,
      sms: false,
      texting: false,
      channels: [...HARBOR_CHANNELS],
      twilioMessagingRequired: false,
      error: HARBOR_SMS_OUT,
    },
  };
}
