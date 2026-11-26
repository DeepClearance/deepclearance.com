import { sha256Hex } from "../lib/seal.mjs";

const tracking = /^(utm_|fbclid|gclid|mc_|ref$|ref_src$|s$|t$)/i;

// The URL to fetch: tracking parameters and fragment removed, host kept as published.
export function cleanUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) if (tracking.test(key)) parsed.searchParams.delete(key);
  parsed.searchParams.sort();
  return parsed.toString();
}

// The dedup key: also lowercases the host, drops "www." and trailing slashes.
export function canonicalUrl(url) {
  const parsed = new URL(cleanUrl(url));
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

export function titleWords(title) {
  return new Set(String(title).toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
    .filter((word) => word.length > 2));
}

export function similarity(a, b) {
  const [x, y] = [titleWords(a), titleWords(b)];
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const word of x) if (y.has(word)) shared++;
  return shared / (x.size + y.size - shared);
}

// Returns the stored lead, or null when the URL or a near-identical title was already seen in 48 hours.
export async function storeLead(env, lead, now) {
  const url = cleanUrl(lead.url);
  const urlHash = await sha256Hex(canonicalUrl(lead.url));
  const recent = await env.DB.prepare("SELECT title FROM leads WHERE seen_at >= ? ORDER BY id DESC LIMIT 300")
    .bind(new Date(now - 48 * 3600_000).toISOString()).all();
  if (recent.results.some((row) => similarity(row.title, lead.title) >= 0.8)) return null;
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO leads (source_id, kind, url, url_hash, title, summary, published_at, seen_at, via) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(lead.sourceId, lead.kind, url, urlHash, lead.title.slice(0, 500), (lead.summary || "").slice(0, 1000),
    lead.publishedAt, new Date(now).toISOString(), lead.via || null).run();
  return result.meta.changes ? { ...lead, url, id: result.meta.last_row_id } : null;
}
