import { sha256Hex } from "../lib/seal.mjs";
import { decode } from "./feeds.mjs";

// Fetches a primary source and records what was fetched: final URL, HTTP status, time, SHA-256 of the
// exact bytes, content type, and readable text for drafting and quote checks.
export async function fetchEvidence(url, now = () => new Date()) {
  const response = await fetch(url, {
    headers: { "user-agent": "DeepClearance-Newsroom/1.0 (+https://deepclearance.com)" },
    signal: AbortSignal.timeout(20000),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "";
  const text = /html|xml|text|json/.test(type) ? decode(new TextDecoder().decode(bytes).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")) : "";
  return {
    url, finalUrl: response.url || url, status: response.status, ok: response.ok, contentType: type,
    fetchedAt: now().toISOString(), sha256: await sha256Hex(bytes), bytes: bytes.byteLength, text: text.slice(0, 60000),
  };
}

export function normalizeForQuote(text) {
  return String(text).toLowerCase().normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}%$.,'" ]/gu, " ").replace(/\s+/g, " ").trim();
}
