/** Dedicated workers.dev floor. Never 302 onto the company .app zone. */
interface Env {
  HOUSE: Fetcher;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.HOUSE.fetch(request);
  },
};
