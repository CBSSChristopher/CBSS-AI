export type VaEnvBits = {
  VA_ENABLED?: string;
  VA_DIAL_ARMED?: string;
  VA_WEBHOOK_SECRET?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_AGENT_ID?: string;
  ELEVENLABS_VOICE_ID?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  VA_CRM_EMAIL?: string;
  VA_CRM_PASSWORD?: string;
  HARBOR_QUOTE_TOKEN?: string;
};

function flag(value: unknown): boolean {
  return String(value || "").trim().toLowerCase() === "true";
}

function present(value: unknown): boolean {
  return Boolean(String(value || "").trim());
}

export function vaEnabled(env: VaEnvBits): boolean {
  return flag(env.VA_ENABLED);
}

export function vaDialArmed(env: VaEnvBits): boolean {
  return flag(env.VA_DIAL_ARMED);
}

/** Voice SID / token / number only. Messaging / A2P is not required. */
export function vaSecretsReady(env: VaEnvBits): boolean {
  return present(env.VA_WEBHOOK_SECRET) && present(env.ELEVENLABS_API_KEY) && present(env.TWILIO_ACCOUNT_SID) && present(env.TWILIO_AUTH_TOKEN) && present(env.TWILIO_PHONE_NUMBER);
}

/** v1 never places a call. Flags + secrets only change the error. */
export function dialGate(env: VaEnvBits): { status: number; body: Record<string, unknown> } {
  if (!vaEnabled(env) || !vaDialArmed(env)) {
    return {
      status: 403,
      body: {
        ok: false,
        parked: true,
        dialing: false,
        error: "Outbound VA dialing is parked. Christopher must paste secrets, approve a dial list, then say go before VA_ENABLED and VA_DIAL_ARMED flip on.",
      },
    };
  }
  if (!vaSecretsReady(env)) {
    return {
      status: 403,
      body: {
        ok: false,
        parked: true,
        dialing: false,
        error: "VA flags are on but Twilio / ElevenLabs / webhook secrets are missing. Harbor will not dial.",
      },
    };
  }
  return {
    status: 501,
    body: {
      ok: false,
      parked: true,
      dialing: false,
      error: "Live Twilio REST dial is not implemented. Harbor will not call anyone until Christopher says go on a written dial list.",
    },
  };
}

export function publicVaStatus(env: VaEnvBits): Record<string, unknown> {
  return {
    enabled: vaEnabled(env),
    dialArmed: vaDialArmed(env),
    dialing: false,
    sms: false,
    texting: false,
    channels: ["call", "email"],
    twilioMessagingRequired: false,
    hasWebhookSecret: present(env.VA_WEBHOOK_SECRET),
    hasElevenLabsKey: present(env.ELEVENLABS_API_KEY),
    hasElevenLabsAgent: present(env.ELEVENLABS_AGENT_ID),
    hasElevenLabsVoice: present(env.ELEVENLABS_VOICE_ID),
    hasTwilioSid: present(env.TWILIO_ACCOUNT_SID),
    hasTwilioToken: present(env.TWILIO_AUTH_TOKEN),
    hasTwilioNumber: present(env.TWILIO_PHONE_NUMBER),
    hasCrmServiceLogin: present(env.VA_CRM_EMAIL) && present(env.VA_CRM_PASSWORD),
    hasHarborQuoteToken: present(env.HARBOR_QUOTE_TOKEN),
    voiceNote: "Neutral professional voice placeholder. Do not clone Christopher without a written decision.",
    harborNote:
      "Harbor opens CTE and sends CTE1–CTE4 through the same live AgentMail path as a Yard rep (Reply-To Harbor). Answers inbound voice on the Twilio DID, and hands ready-to-buy to Christopher Banks or Bryan Reese. Call + email only — no SMS. Dial stays parked until VA_DIAL_ARMED. This is not the Harbor staff-comms Grok Bot. Harbor does not collect payment.",
  };
}
