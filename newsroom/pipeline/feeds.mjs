// Minimal RSS 2.0 / RSS 1.0 (RDF) / Atom reader for the Worker runtime (no DOM parser there).
const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decode(text) {
  return String(text ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, code) => code[0] === "#"
      ? String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)))
      : entities[code.toLowerCase()] ?? all)
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    if (match) return decode(match[1]);
  }
  return "";
}

export function parseFeed(xml, maxItems = 25) {
  const blocks = [...String(xml).matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0, maxItems);
  return blocks.map(([, , block]) => {
    const atomLink = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i)?.[1];
    const link = tag(block, ["link"]) || atomLink || tag(block, ["guid", "id"]);
    const when = tag(block, ["pubDate", "dc:date", "published", "updated"]);
    const parsed = when ? new Date(when) : null;
    return {
      title: tag(block, ["title"]),
      url: decode(link),
      summary: tag(block, ["description", "summary", "content"]).slice(0, 1000),
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    };
  }).filter((item) => item.title && /^https?:\/\//.test(item.url));
}

export async function fetchFeed(source) {
  const response = await fetch(source.url, {
    headers: { "user-agent": "DeepClearance-Newsroom/1.0 (+https://deepclearance.com)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${source.id} returned ${response.status}`);
  return parseFeed(await response.text(), source.maxItems || 25);
}
