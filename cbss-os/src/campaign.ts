import type { Env } from "./auth.ts";

const KEY = "campaign:leads";

export type CampaignReason = "hold" | "bad_number";

export type CampaignLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  owner: string;
  addedBy: string;
  addedAt: string;
  reason?: CampaignReason;
};

export function campaignReasonOf(lead: { reason?: string } | null | undefined): CampaignReason {
  return String(lead?.reason || "").trim() === "bad_number" ? "bad_number" : "hold";
}

async function readBag(env: Env): Promise<CampaignLead[]> {
  if (!env.SESSIONS) return [];
  const raw = await env.SESSIONS.get(KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { items?: CampaignLead[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

async function writeBag(env: Env, items: CampaignLead[]): Promise<void> {
  if (!env.SESSIONS) return;
  await env.SESSIONS.put(KEY, JSON.stringify({ items }));
}

export async function listCampaign(env: Env): Promise<CampaignLead[]> {
  return readBag(env);
}

export async function addCampaign(env: Env, lead: CampaignLead): Promise<CampaignLead[]> {
  const items = await readBag(env);
  const id = String(lead.id || "").trim();
  if (!id) return items;
  const prior = items.find((row) => String(row.id) === id);
  const next = items.filter((row) => String(row.id) !== id);
  const reason = campaignReasonOf(lead) === "bad_number" || campaignReasonOf(prior) === "bad_number"
    ? "bad_number"
    : "hold";
  next.unshift({
    id,
    name: String(lead.name || prior?.name || "").trim(),
    email: String(lead.email || prior?.email || "").trim(),
    phone: String(lead.phone || prior?.phone || "").trim(),
    city: String(lead.city || prior?.city || "").trim(),
    owner: String(lead.owner || prior?.owner || "").trim(),
    addedBy: String(lead.addedBy || prior?.addedBy || "").trim(),
    addedAt: lead.addedAt || prior?.addedAt || new Date().toISOString(),
    reason,
  });
  await writeBag(env, next);
  return next;
}

export async function returnCampaign(env: Env, id: string): Promise<CampaignLead[]> {
  const items = (await readBag(env)).filter((row) => String(row.id) !== String(id));
  await writeBag(env, items);
  return items;
}
