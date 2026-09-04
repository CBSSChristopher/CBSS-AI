import { jsonResponse, optionsResponse, readSession } from "./auth.js";

export const DEFAULT_MANAGER_APPROVAL_CODE = ["6", "5", "1", "6"].join("");

function timingSafeEqualStr(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (!aa || aa.length !== bb.length) return false;
  let x = 0;
  for (let i = 0; i < aa.length; i++) x |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return x === 0;
}

export function normalizeApprovalCode(raw) {
  return String(raw ?? "").replace(/\s+/g, "").trim();
}

export function expectedApprovalCode(env) {
  const fromEnv = env && env.MANAGER_APPROVAL_CODE;
  if (fromEnv != null && String(fromEnv).trim()) return normalizeApprovalCode(fromEnv);
  return DEFAULT_MANAGER_APPROVAL_CODE;
}

export function isValidManagerApprovalCode(raw, env) {
  const got = normalizeApprovalCode(raw);
  const want = expectedApprovalCode(env);
  if (!got || !want) return false;
  return timingSafeEqualStr(got, want);
}

export function isApprovedPricingRequest(data) {
  if (!data || typeof data !== "object") return false;
  if (data.approvedPricing === true || data.approvedPricing === "true" || data.approvedPricing === 1) return true;
  const mode = String(data.pricingMode || "").trim().toLowerCase();
  return mode === "christopher-approved" || mode === "approved";
}

export function parseApprovedCash(raw) {
  const text = String(raw ?? "").replace(/[$,\s]/g, "");
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export async function handleVerifyApproval(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "Method not allowed" });
  const user = await readSession(request, env);
  if (!user) return jsonResponse(request, 401, { error: "Unauthorized" });
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(request, 400, { error: "Invalid JSON" });
  }
  if (!isValidManagerApprovalCode(body.code || body.managerApprovalCode, env)) {
    return jsonResponse(request, 403, { ok: false, error: "Invalid manager approval code." });
  }
  return jsonResponse(request, 200, { ok: true, approved: true });
}
