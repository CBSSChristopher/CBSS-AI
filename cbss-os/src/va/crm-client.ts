import { origins, UA, type Env } from "../auth.ts";

export async function crmRequestWithCookie(
  env: Env,
  cookie: string,
  init: { method?: string; search?: string; body?: Record<string, unknown> },
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const origin = origins(env).crm;
  const method = init.method || "POST";
  const path = "/crm-data" + (init.search || "");
  const req = new Request(origin + path, {
    method,
    headers: {
      Cookie: cookie,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: origin,
    },
    body: method === "GET" || method === "HEAD" || !init.body ? undefined : JSON.stringify(init.body),
  });
  const res = env.CRM ? await env.CRM.fetch(req) : await fetch(req);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function contactsFromCrmPayload(data: Record<string, unknown>): unknown[] {
  if (Array.isArray(data.contacts)) return data.contacts;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};
  return Array.isArray(nested.contacts) ? nested.contacts : [];
}

export function contactsAddedFromCrmPayload(data: Record<string, unknown>): Record<string, unknown>[] {
  const raw = Array.isArray(data.contactsAdded)
    ? data.contactsAdded
    : data.data && typeof data.data === "object" && Array.isArray((data.data as Record<string, unknown>).contactsAdded)
      ? ((data.data as Record<string, unknown>).contactsAdded as unknown[])
      : [];
  return raw.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
}

export function crmContactPool(data: Record<string, unknown>): unknown[] {
  return contactsAddedFromCrmPayload(data).concat(contactsFromCrmPayload(data));
}
