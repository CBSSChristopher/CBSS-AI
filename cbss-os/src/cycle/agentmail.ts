export const AGENTMAIL_API = "https://api.agentmail.to/v0";
export const DEFAULT_INBOX = "cbss@agentmail.to";

export type AgentMailAttachment = {
  filename: string;
  content_type?: string;
  content?: string;
  url?: string;
  content_disposition?: "inline" | "attachment";
};

export type SendMailInput = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: AgentMailAttachment[];
  labels?: string[];
};

export type SendMailResult =
  | { ok: true; messageId: string; threadId: string }
  | { ok: false; error: string; transient: boolean; status?: number };

export type ListedMessage = {
  messageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  labels: string[];
  createdAt: string;
};

function inboxId(env: { AGENTMAIL_INBOX?: string }): string {
  return String(env.AGENTMAIL_INBOX || DEFAULT_INBOX).trim() || DEFAULT_INBOX;
}

export function agentMailReady(env: { AGENTMAIL_API_KEY?: string }): boolean {
  return Boolean(String(env.AGENTMAIL_API_KEY || "").trim());
}

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function agentMailFetch(
  env: { AGENTMAIL_API_KEY?: string; AGENTMAIL_INBOX?: string },
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number; body: unknown; text: string }> {
  const key = String(env.AGENTMAIL_API_KEY || "").trim();
  if (!key) return { ok: false, status: 0, body: null, text: "AGENTMAIL_API_KEY is not set." };
  const res = await fetchImpl(`${AGENTMAIL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body, text };
}

export async function sendAgentMail(
  env: { AGENTMAIL_API_KEY?: string; AGENTMAIL_INBOX?: string },
  input: SendMailInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SendMailResult> {
  if (!agentMailReady(env)) {
    return { ok: false, error: "AgentMail is not configured. Set AGENTMAIL_API_KEY on this Worker.", transient: false };
  }
  const to = (input.to || []).map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
  if (!to.length) return { ok: false, error: "No client email — pause, do not send.", transient: false };
  const payload: Record<string, unknown> = {
    to,
    subject: input.subject,
    text: input.text,
  };
  if (input.html) payload.html = input.html;
  if (input.cc?.length) payload.cc = input.cc;
  if (input.bcc?.length) payload.bcc = input.bcc;
  if (input.replyTo?.length) payload.reply_to = input.replyTo;
  if (input.labels?.length) payload.labels = input.labels;
  if (input.attachments?.length) payload.attachments = input.attachments;
  let last: SendMailResult = { ok: false, error: "AgentMail send did not run.", transient: true };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await agentMailFetch(
        env,
        `/inboxes/${encodeURIComponent(inboxId(env))}/messages/send`,
        { method: "POST", body: JSON.stringify(payload) },
        fetchImpl,
      );
      const rec = result.body && typeof result.body === "object" ? (result.body as Record<string, unknown>) : {};
      const messageId = String(rec.message_id || rec.messageId || "").trim();
      const threadId = String(rec.thread_id || rec.threadId || "").trim();
      if (result.ok && messageId) return { ok: true, messageId, threadId };
      const err = String(rec.error || rec.message || result.text || `AgentMail ${result.status}`).slice(0, 240);
      last = { ok: false, error: err, transient: isTransientStatus(result.status), status: result.status };
      if (!last.transient) return last;
    } catch (err) {
      last = { ok: false, error: err instanceof Error ? err.message : "Could not reach AgentMail.", transient: true };
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  return last;
}

export async function listInboxMessages(
  env: { AGENTMAIL_API_KEY?: string; AGENTMAIL_INBOX?: string },
  query: { limit?: number; pageToken?: string; labels?: string[] } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; messages: ListedMessage[]; nextPageToken: string } | { ok: false; error: string }> {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.pageToken) params.set("page_token", query.pageToken);
  if (query.labels?.length) {
    for (const label of query.labels) params.append("labels", label);
  }
  const q = params.toString() ? `?${params}` : "";
  try {
    const result = await agentMailFetch(env, `/inboxes/${encodeURIComponent(inboxId(env))}/messages${q}`, {}, fetchImpl);
    if (!result.ok) return { ok: false, error: `AgentMail list failed (${result.status}).` };
    const rec = result.body && typeof result.body === "object" ? (result.body as Record<string, unknown>) : {};
    const rows = Array.isArray(rec.messages) ? rec.messages : [];
    const messages: ListedMessage[] = rows.map((row) => {
      const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const to = Array.isArray(item.to) ? item.to.map(String) : [];
      return {
        messageId: String(item.message_id || item.messageId || "").trim(),
        threadId: String(item.thread_id || item.threadId || "").trim(),
        from: String(item.from || "").trim(),
        to,
        subject: String(item.subject || "").trim(),
        labels: Array.isArray(item.labels) ? item.labels.map(String) : [],
        createdAt: String(item.created_at || item.createdAt || "").trim(),
      };
    });
    return {
      ok: true,
      messages,
      nextPageToken: String(rec.next_page_token || rec.nextPageToken || ""),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not list AgentMail." };
  }
}

/** Minimal Svix-compatible verify for AgentMail webhooks (whsec_ secret). */
export async function verifyAgentMailWebhook(
  secret: string,
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const id = headers.get("svix-id") || headers.get("webhook-id") || "";
  const ts = headers.get("svix-timestamp") || headers.get("webhook-timestamp") || "";
  const sigHeader = headers.get("svix-signature") || headers.get("webhook-signature") || "";
  if (!secret || !id || !ts || !sigHeader) return false;
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(Number(ts)) || age > 60 * 5) return false;
  const material = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    const bin = atob(material);
    keyBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) keyBytes[i] = bin.charCodeAt(i);
  } catch {
    keyBytes = new TextEncoder().encode(material);
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = `${id}.${ts}.${rawBody}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const parts = sigHeader.split(" ").map((p) => p.replace(/^v1,/, "").trim()).filter(Boolean);
  return parts.some((p) => p === expected);
}
