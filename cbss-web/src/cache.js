export function cacheControl(pathname, type) {
  const kind = String(type || "");
  const path = String(pathname || "");
  if (path.startsWith("/api/")) return "no-store";
  if (/\.(woff2|webp|png|svg|jpg|jpeg|ico)$/i.test(path)) {
    return "public, max-age=604800, stale-while-revalidate=2592000";
  }
  if (/\.(css|js)$/i.test(path)) {
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  if (kind.includes("text/html") || path === "/" || !path.includes(".")) {
    return "public, max-age=120, stale-while-revalidate=86400";
  }
  return "public, max-age=300, stale-while-revalidate=86400";
}
