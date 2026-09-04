/** Alias worker: serve The Yard on this host. Never 302 onto *.cbshippingsolutions.app. */
interface Env {
  HOUSE: Fetcher;
}

/** Every hostname stays here — workers.dev and custom domains. Never send a 302. */
export function yardAliasAction(_hostname: string, _method: string): "proxy" {
  return "proxy";
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.HOUSE.fetch(request);
  },
};
