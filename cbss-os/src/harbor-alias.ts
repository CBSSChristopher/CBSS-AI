/** Alias worker: serve The Yard on this host. Never 302 onto *.cbshippingsolutions.app. */
interface Env {
  HOUSE: Fetcher;
}

/** Every hostname stays here — workers.dev and custom domains. Never send a 302. */
export function yardAliasAction(_hostname: string, _method: string): "proxy" {
  return "proxy";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = new Headers(request.headers);
    const auth = request.headers.get("Authorization");
    const cookie = request.headers.get("Cookie");
    if (auth) headers.set("Authorization", auth);
    if (cookie) headers.set("Cookie", cookie);
    const init: RequestInit & { duplex?: string } = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }
    const res = await env.HOUSE.fetch(new Request(request.url, init));
    const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (!cookies.length) return res;
    const out = new Headers(res.headers);
    out.delete("Set-Cookie");
    for (const c of cookies) out.append("Set-Cookie", c);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  },
};
