import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inlineBrandCss } from "../src/brand-html.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const pub = join(root, "public");
const out = resolve(process.argv[2] || join(root, "..", "docs"));

function walk(dir, base = "") {
  const entries = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + "/" + name.name : name.name;
    if (name.isDirectory()) entries.push(...walk(join(dir, name.name), rel));
    else entries.push(rel);
  }
  return entries;
}

function pagePath(file) {
  if (file === "index.html" || file === "404.html") return file;
  if (file.endsWith(".html")) return file.slice(0, -5) + "/index.html";
  return file;
}

const redirect = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=/request" />
  <link rel="canonical" href="https://cbshippingsolutions.app/request" />
  <title>Request information · CBShippingSolutions</title>
  <script>location.replace("/request");</script>
</head>
<body>
  <p><a href="/request">Request information</a></p>
</body>
</html>
`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const css = readFileSync(join(pub, "styles.css"), "utf8");
for (const file of walk(pub)) {
  const dest = join(out, pagePath(file));
  mkdirSync(dirname(dest), { recursive: true });
  if (file.endsWith(".html")) {
    const html = readFileSync(join(pub, file), "utf8");
    writeFileSync(dest, inlineBrandCss(html, css));
  } else {
    cpSync(join(pub, file), dest);
  }
}
mkdirSync(join(out, "contact"), { recursive: true });
writeFileSync(join(out, "contact", "index.html"), inlineBrandCss(redirect, css));
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "CNAME"), "cbshippingsolutions.app\n");
console.log("wrote", out);
