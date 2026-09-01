/** Public bookmark for The Yard. Company hostname, not workers.dev. */
import { YARD_PUBLIC } from "./brand.ts";

interface Env {
  HOUSE: Fetcher;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname.endsWith(".workers.dev")) {
      return Promise.resolve(Response.redirect(YARD_PUBLIC + url.pathname + url.search, 302));
    }
    return env.HOUSE.fetch(request);
  },
};
