import {
  handleHopConsume,
  handleHopIssue,
  handleLogin,
  handleLogout,
  handleMe,
  normalizePath,
  optionsResponse,
} from "./auth.js";
import { handleInventory, handleInventoryRefresh, refreshXchangeInventory } from "./inventory.js";
import { handleSubmitProposal } from "./submit-proposal.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    if (path === "/auth/login") return handleLogin(request, env);
    if (path === "/auth/me") return handleMe(request, env);
    if (path === "/auth/logout") return handleLogout(request);
    if (path === "/auth/hop") {
      if (request.method === "GET") return handleHopConsume(request, env);
      return handleHopIssue(request, env);
    }
    if (path === "/inventory/refresh") return handleInventoryRefresh(request, env);
    if (path === "/inventory") return handleInventory(request, env);
    if (path === "/submit-proposal") return handleSubmitProposal(request, env);
    if (request.method === "OPTIONS") return optionsResponse(request);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
  async scheduled(_event, env) {
    const result = await refreshXchangeInventory(env);
    if (!result.ok && !result.keptExisting) {
      console.log("xChange refresh failed", result.error || "");
    }
  },
};
