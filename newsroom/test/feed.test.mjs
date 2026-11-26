import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const root = new URL("../../", import.meta.url);

test("the static export feed uses real publish times, self link, and a dispatch sitemap", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dc-feed-"));
  await mkdir(join(dir, "scripts"));
  await mkdir(join(dir, "lib"));
  await cp(new URL("scripts/prepare-dispatches.mjs", root), join(dir, "scripts/prepare-dispatches.mjs"));
  await cp(new URL("lib/dispatches.js", root), join(dir, "lib/dispatches.js"));
  const story = { slug: "fed-notice", title: "A & B <notice>", summary: "Summary", date: "2026-11-25",
    paragraphs: ["P"], sources: [{ title: "S", url: "https://www.federalregister.gov/" }], updates: [], revision: 2,
    publishedAt: "2026-11-25T14:03:07.123Z", updatedAt: "2026-11-26T09:00:00.000Z" };
  const server = createServer((req, res) => {
    if (req.headers.authorization !== "Bearer t") { res.writeHead(401).end(); return; }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify([story]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await promisify(execFile)(process.execPath, ["scripts/prepare-dispatches.mjs"], {
      cwd: dir, env: { ...process.env, NEWSROOM_URL: `http://127.0.0.1:${server.address().port}`, NEWSROOM_BUILD_TOKEN: "t" },
    });
  } finally { server.close(); }
  const rss = await readFile(join(dir, "public/dispatches/rss.xml"), "utf8");
  assert.match(rss, /<pubDate>Wed, 25 Nov 2026 14:03:07 GMT<\/pubDate>/);
  assert.match(rss, /<atom:link href="https:\/\/deepclearance.com\/dispatches\/rss.xml" rel="self"/);
  assert.match(rss, /<title>A &amp; B &lt;notice&gt;<\/title>/);
  assert.match(rss, /<lastBuildDate>Thu, 26 Nov 2026 09:00:00 GMT<\/lastBuildDate>/);
  const sitemap = await readFile(join(dir, "public/dispatches/sitemap.xml"), "utf8");
  assert.match(sitemap, /<loc>https:\/\/deepclearance.com\/dispatches\/fed-notice\/<\/loc><lastmod>2026-11-26T09:00:00.000Z<\/lastmod>/);
  assert.match(sitemap, /introducing-dispatches/);
});
