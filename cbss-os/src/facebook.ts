export const FACEBOOK_TOKEN_KEY = "facebook:client-token";

export function isChristopherUser(email: string, name: string): boolean {
  const e = String(email || "").trim().toLowerCase();
  const n = String(name || "").trim().toLowerCase();
  return e.startsWith("christopher@") || n === "christopher banks";
}

export function publicFacebookStatus(input: {
  appId?: string;
  hasAppSecret?: boolean;
  hasClientToken?: boolean;
  webhookUrl?: string;
}): {
  appId: string;
  hasAppSecret: boolean;
  hasClientToken: boolean;
  webhookUrl: string;
} {
  return {
    appId: String(input.appId || "").trim(),
    hasAppSecret: Boolean(input.hasAppSecret),
    hasClientToken: Boolean(input.hasClientToken),
    webhookUrl: String(input.webhookUrl || "https://cbsscrm.cbss.workers.dev/webhooks/meta-leadgen").trim(),
  };
}

export function readFacebookUpload(body: Record<string, unknown>): {
  appId: string;
  appSecret: string;
  clientToken: string;
} {
  const src = body && typeof body === "object" ? body : {};
  return {
    appId: String(src.appId || src.app_id || "").trim(),
    appSecret: String(src.appSecret || src.app_secret || "").trim(),
    clientToken: String(src.clientToken || src.client_token || "").trim(),
  };
}
