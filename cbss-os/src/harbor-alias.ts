/** Alias worker: proxy The Yard. Do not 302 workers.dev onto the company .app zone. */
import { YARD_PUBLIC } from "./brand.ts";

interface Env {
  HOUSE: Fetcher;
}

/** crm. GET can move Chrome users. workers.dev must stay on this host — Safari cannot open .app. */
export function yardAliasAction(hostname: string, method: string): "redirect" | "proxy" {
  const host = String(hostname || "").toLowerCase();
  if (host.endsWith(".workers.dev")) return "proxy";
  if (host === "crm.cbshippingsolutions.app" && method.toUpperCase() === "GET") return "redirect";
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
