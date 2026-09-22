function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export async function hmacSha256Hex(secret: string, material: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(material));
  return hex(sig);
}

export function vaSignatureHeader(headers: Headers): string {
  return (
    headers.get("x-va-signature") ||
    headers.get("x-webhook-signature") ||
    headers.get("x-elevenlabs-signature") ||
    ""
  );
}

/** HMAC-SHA256 of the raw body. Optional X-VA-Timestamp signs `<ts>.<body>` and rejects >5 min. */
export async function verifyVaWebhook(secret: string, headers: Headers, rawBody: string): Promise<boolean> {
  const key = String(secret || "").trim();
  if (!key) return false;
  const given = vaSignatureHeader(headers).replace(/^sha256=/i, "").trim().toLowerCase();
  if (!given) return false;
  const ts = String(headers.get("x-va-timestamp") || headers.get("webhook-timestamp") || "").trim();
  let material = rawBody;
  if (ts) {
    const age = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(Number(ts)) || age > 60 * 5) return false;
    material = `${ts}.${rawBody}`;
  }
  const expected = (await hmacSha256Hex(key, material)).toLowerCase();
  return timingSafeEqualStr(given, expected);
}
