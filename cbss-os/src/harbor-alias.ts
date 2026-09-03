/** Public bookmark for The Yard. Company hostname, not workers.dev. */
import { YARD_PUBLIC } from "./brand.ts";

interface Env {
  HOUSE: Fetcher;
}

/** Send people to the company hostname. Do not 302 a login POST — the browser drops the password. */
export function yardAliasAction(hostname: string, method: string): "redirect" | "proxy" {
  const host = String(hostname || "").toLowerCase();
  if (host === "crm.cbshippingsolutions.app" && method.toUpperCase() === "GET") return "redirect";
  if (host.endsWith(".workers.dev") && method.toUpperCase() === "GET") return "redirect";
  return "proxy";
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (yardAliasAction(url.hostname, request.method) === "redirect") {
      return Promise.resolve(Response.redirect(YARD_PUBLIC + url.pathname + url.search, 302));
    }
    return env.HOUSE.fetch(request);
  },
};
