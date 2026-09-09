import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderNextStepsPdf } from "../src/next-steps-guide-pdf.ts";

const root = dirname(fileURLToPath(new URL("../assets/.keep", import.meta.url)));
mkdirSync(root, { recursive: true });
const dest = join(root, "CBSS-Next-Steps-After-Your-Order.pdf");
const bytes = renderNextStepsPdf();
writeFileSync(dest, bytes);
console.log(`wrote ${dest} (${bytes.length} bytes)`);
