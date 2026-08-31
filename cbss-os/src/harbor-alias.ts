/** Public bookmark for The Yard. Stays on theyard.cbss.workers.dev and talks to the house worker. */
interface Env {
  HOUSE: Fetcher;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.HOUSE.fetch(request);
  },
};
