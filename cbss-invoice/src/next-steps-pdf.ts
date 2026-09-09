import { renderNextStepsPdf } from "./next-steps-guide-pdf.ts";

export const NEXT_STEPS_PDF_NAME = "CBSS-Next-Steps-After-Your-Order.pdf";
export const NEXT_STEPS_PDF_ASSET = "CBSS-Next-Steps-After-Your-Order.pdf";

export type NextStepsPdfEnv = {
  ASSETS?: Fetcher;
  NEXT_STEPS_PDF_URL?: string;
};

export type NextStepsPdfAttachment = {
  filename: string;
  content_type: "application/pdf";
  content: string;
  content_disposition: "attachment";
};

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodePdfBase64(content: string): Uint8Array {
  const bin = atob(content);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function nextStepsPdfAttachmentFromBytes(bytes: Uint8Array): NextStepsPdfAttachment {
  return {
    filename: NEXT_STEPS_PDF_NAME,
    content_type: "application/pdf",
    content: bytesToBase64(bytes),
    content_disposition: "attachment",
  };
}

function looksLikePdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

async function readFromAssets(env?: NextStepsPdfEnv): Promise<Uint8Array | null> {
  if (!env?.ASSETS) return null;
  const paths = [`/${NEXT_STEPS_PDF_ASSET}`, `/assets/${NEXT_STEPS_PDF_ASSET}`];
  for (const path of paths) {
    try {
      const res = await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (looksLikePdf(bytes)) return bytes;
    } catch {
      // try the next path
    }
  }
  return null;
}

async function readFromDisk(): Promise<Uint8Array | null> {
  try {
    const { existsSync, readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = import.meta.url;
    const candidates = [
      new URL(`../assets/${NEXT_STEPS_PDF_ASSET}`, here),
      new URL(`../../cbss-invoice/assets/${NEXT_STEPS_PDF_ASSET}`, here),
    ];
    for (const href of candidates) {
      const path = fileURLToPath(href);
      if (!existsSync(path)) continue;
      const bytes = new Uint8Array(readFileSync(path));
      if (looksLikePdf(bytes)) return bytes;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Load Next Steps PDF bytes for AgentMail `content` attach.
 * Never uses NEXT_STEPS_PDF_URL. Prefer the bundled asset file, then the branded renderer.
 */
export async function loadNextStepsPdfBytes(env?: NextStepsPdfEnv): Promise<Uint8Array | null> {
  const fromAssets = await readFromAssets(env);
  if (fromAssets) return fromAssets;
  const fromDisk = await readFromDisk();
  if (fromDisk) return fromDisk;
  try {
    const generated = renderNextStepsPdf();
    if (looksLikePdf(generated)) return generated;
  } catch (err) {
    console.error(
      "next_steps_pdf_render_error",
      err instanceof Error ? err.message : "Could not render Next Steps PDF.",
    );
  }
  return null;
}

export async function loadNextStepsPdf(env?: NextStepsPdfEnv): Promise<NextStepsPdfAttachment | null> {
  const bytes = await loadNextStepsPdfBytes(env);
  if (!bytes) {
    console.warn(
      "next_steps_pdf_missing",
      `Paid email will send without a PDF. Add cbss-invoice/assets/${NEXT_STEPS_PDF_ASSET}. NEXT_STEPS_PDF_URL is not used for attach.`,
    );
    return null;
  }
  return nextStepsPdfAttachmentFromBytes(bytes);
}

export function nextStepsPdfResponse(bytes: Uint8Array, extraHeaders: HeadersInit = {}): Response {
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${NEXT_STEPS_PDF_NAME}"`,
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}
