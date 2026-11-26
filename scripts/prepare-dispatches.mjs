import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "https://deepclearance.com";
const base = process.env.NEWSROOM_URL;
const token = process.env.NEWSROOM_BUILD_TOKEN;
const snapshot = resolve(".newsroom-dispatches.json");
const media = resolve("public/assets/newsroom");
const staticModule = await readFile("lib/dispatches.js", "utf8");
const { dispatches: existing } = await import("data:text/javascript;base64," + Buffer.from(staticModule).toString("base64"));

async function get(path) {
  const response = await fetch(new URL(`/api/build/${path}`, base), {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Newsroom returned ${response.status} for ${path}`);
  return response;
}

if (Boolean(base) !== Boolean(token)) throw new Error("Set both NEWSROOM_URL and NEWSROOM_BUILD_TOKEN.");
if (base && new URL(base).protocol !== "https:" && !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("NEWSROOM_URL must use HTTPS.");
}

const published = base ? await (await get("dispatches")).json() : [];
if (!Array.isArray(published)) throw new Error("Invalid newsroom snapshot.");
const articles = new Map(existing.map(article => [article.slug, article]));
await rm(media, { recursive: true, force: true });
await mkdir(media, { recursive: true });
for (const article of published) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) || !article.title || !article.date) {
    throw new Error("Invalid published dispatch.");
  }
  if (article.image) {
    const { key, alt } = article.image;
    const ext = /^[a-f0-9]{64}\.(png|jpg|webp)$/.exec(key)?.[1];
    if (!ext) throw new Error("Invalid newsroom card key.");
    const response = await get(`media/${key}`);
    await writeFile(resolve(media, key), Buffer.from(await response.arrayBuffer()));
    article.image = { src: `/assets/newsroom/${key}`, alt, type: `image/${ext === "jpg" ? "jpeg" : ext}` };
  }
  articles.set(article.slug, article);
}
const list = [...articles.values()].sort((a, b) => b.date.localeCompare(a.date));
await writeFile(snapshot, JSON.stringify(list));
const escape = (value) => String(value ?? "").replace(/[<>&"']/g, char =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]);
// Real timestamps: the newsroom's first-publish time; repo articles may set publishedAt, else midnight UTC of date.
const firstPublished = (article) => new Date(article.publishedAt || `${article.date}T00:00:00Z`);
const updated = (article) => new Date(article.updatedAt || article.publishedAt || `${article.date}T00:00:00Z`);
const newest = list.length ? new Date(Math.max(...list.map(article => updated(article).getTime()))) : new Date(0);
const items = list.map(article => {
  const link = `${origin}/dispatches/${article.slug}/`;
  return `<item><title>${escape(article.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><description>${escape(article.summary)}</description><pubDate>${firstPublished(article).toUTCString()}</pubDate></item>`;
});
await mkdir("public/dispatches", { recursive: true });
await writeFile("public/dispatches/rss.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Deep Clearance Dispatch</title><link>${origin}/dispatches/</link><description>Deep Clearance reporting and analysis</description><language>en</language><lastBuildDate>${newest.toUTCString()}</lastBuildDate><atom:link href="${origin}/dispatches/rss.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
</channel></rss>
`);
// Dispatch sitemap, listed in robots.txt next to the hand-kept /sitemap.xml, so newsroom stories are indexed.
const urls = [`<url><loc>${origin}/dispatches/</loc><lastmod>${newest.toISOString()}</lastmod></url>`,
  ...list.map(article => `<url><loc>${origin}/dispatches/${article.slug}/</loc><lastmod>${updated(article).toISOString()}</lastmod></url>`)];
await writeFile("public/dispatches/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`);
