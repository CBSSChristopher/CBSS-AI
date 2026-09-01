/** Put the navy/gold CSS in the HTML so the page is not a flat text dump if /styles.css fails. */
export function inlineBrandCss(html, css) {
  const page = String(html || "");
  const sheet = String(css || "");
  if (!page.includes("</head>")) return page;
  if (page.includes("data-cbss-brand")) return page;
  if (!sheet.trim()) return page;
  const safe = sheet.replace(/<\/style/gi, "<\\/style");
  return page
    .replace(/<link\s+rel=["']stylesheet["']\s+href=["']\/styles\.css["']\s*\/?>\s*/i, "")
    .replace("</head>", `<style data-cbss-brand>${safe}</style></head>`);
}
