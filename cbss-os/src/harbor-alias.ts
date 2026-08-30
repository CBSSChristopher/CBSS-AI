/** Public name for the house tool. Proxies to cbssos so the bookmark stays harbor.cbss.workers.dev. */
const ORIGIN = "https://cbssos.cbss.workers.dev";

export default {
  async fetch(request: Request): Promise<Response> {
    const incoming = new URL(request.url);
    const dest = new URL(incoming.pathname + incoming.search, ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");
    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }
    const res = await fetch(dest.toString(), init);
    const out = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      out.append(key, value);
    });
    const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const cookie of cookies) {
      out.append("set-cookie", cookie.replace(/;\s*domain=[^;]+/gi, ""));
    }
    const location = out.get("location");
    if (location) {
      out.set("location", location.replace(ORIGIN, incoming.origin));
    }
    return new Response(res.body, { status: res.status, headers: out });
  },
};
