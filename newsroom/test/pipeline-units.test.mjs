import assert from "node:assert/strict";
import test from "node:test";
import { renderCard } from "../pipeline/cards.mjs";
import { HARD_MAX_PER_HOUR, loadConfig, postingMode } from "../pipeline/config.mjs";
import { canonicalUrl, similarity } from "../pipeline/dedup.mjs";
import { parseFeed } from "../pipeline/feeds.mjs";
import { checkDraft } from "../pipeline/guardrails.mjs";

test("queue is the only mode unless both switches are flipped", () => {
  assert.equal(postingMode({}), "queue");
  assert.equal(postingMode({ POSTING_MODE: "auto" }), "queue");
  assert.equal(postingMode({ AUTO_POSTING_ENABLED: "true" }), "queue");
  assert.equal(postingMode({ POSTING_MODE: "auto", AUTO_POSTING_ENABLED: "TRUE" }), "queue");
  assert.equal(postingMode({ POSTING_MODE: "auto", AUTO_POSTING_ENABLED: "true" }), "auto");
});

test("config cannot raise the hourly hard cap", () => {
  assert.equal(loadConfig({ CADENCE_JSON: '{"maxPerHour": 50}' }).cadence.maxPerHour, HARD_MAX_PER_HOUR);
  assert.equal(loadConfig({}).cadence.postsPerDay, 12);
});

test("feeds: RSS 2.0, RSS 1.0 and Atom", () => {
  const rss = parseFeed(`<rss><channel><item><title>Fed &amp; Board</title><link>https://www.federalreserve.gov/a.htm</link><pubDate>Wed, 25 Nov 2026 19:00:00 GMT</pubDate><description><![CDATA[<p>Text</p>]]></description></item></channel></rss>`);
  assert.deepEqual(rss[0], { title: "Fed & Board", url: "https://www.federalreserve.gov/a.htm", summary: "Text", publishedAt: "2026-11-25T19:00:00.000Z" });
  const rdf = parseFeed(`<rdf:RDF><item rdf:about="x"><title>BIS</title><link>https://www.bis.org/r.htm</link><dc:date>2026-11-25T10:00:00Z</dc:date></item></rdf:RDF>`);
  assert.equal(rdf[0].publishedAt, "2026-11-25T10:00:00.000Z");
  const atom = parseFeed(`<feed><entry><title>ECB</title><link href="https://www.ecb.europa.eu/p.html"/><updated>2026-11-25T08:00:00Z</updated></entry></feed>`);
  assert.equal(atom[0].url, "https://www.ecb.europa.eu/p.html");
});

test("dedup normalizes URLs and catches near-identical titles", () => {
  assert.equal(canonicalUrl("https://WWW.sec.gov/news/x/?utm_source=a&b=2#top"), "https://sec.gov/news/x?b=2");
  assert.ok(similarity("SEC charges firm over misleading disclosures", "SEC charges firm over misleading disclosures today") >= 0.8);
  assert.ok(similarity("Fed holds rates", "CFTC approves contract") < 0.2);
});

const config = loadConfig({});
const evidence = [{ url: "https://www.sec.gov/newsroom/press-releases/2026-1", finalUrl: "https://www.sec.gov/newsroom/press-releases/2026-1",
  ok: true, status: 200, fetchedAt: "2026-11-26T19:00:00.000Z", sha256: "f".repeat(64),
  text: "The Securities and Exchange Commission today charged Example Corp. with misleading investors about its reserves." }];
const draft = { slug: "sec-charges-example-corp", title: "SEC charges Example Corp. over reserve disclosures", summary: "An SEC complaint filed today.",
  paragraphs: ["The SEC complaint says..."], xCopy: "The SEC charged Example Corp. with misleading investors about its reserves, according to its press release.",
  claims: [{ claim: "The SEC charged Example Corp.", quote: "today charged Example Corp. with misleading investors", sourceUrl: evidence[0].url }] };

test("guardrails: primary source, verbatim quote, blocklist and X length", () => {
  const ok = checkDraft(draft, evidence, config);
  assert.equal(ok.ok, true, ok.reasons.join());
  assert.deepEqual(Object.keys(ok.claims[0]).sort(), ["claim", "fetchedAt", "httpStatus", "primary", "quote", "quoteFound", "sha256", "sourceUrl"]);
  assert.equal(ok.claims[0].sha256, "f".repeat(64));
  assert.match(checkDraft({ ...draft, claims: [] }, evidence, config).reasons.join(), /No claims/);
  assert.match(checkDraft({ ...draft, claims: [{ ...draft.claims[0], quote: "charged Example Corp. with fraud and theft" }] }, evidence, config).reasons.join(), /quote is not in/);
  const blog = [{ ...evidence[0], url: "https://someblog.example/p", finalUrl: "https://someblog.example/p" }];
  assert.match(checkDraft({ ...draft, claims: [{ ...draft.claims[0], sourceUrl: "https://someblog.example/p" }] }, blog, config).reasons.join(), /no fetched primary source/);
  assert.match(checkDraft({ ...draft, xCopy: "🚨 " + draft.xCopy }, evidence, config).reasons.join(), /Blocked term/);
  assert.match(checkDraft({ ...draft, xCopy: "x".repeat(270) }, evidence, config).reasons.join(), /over 280/);
});

test("card rendering is off by default and pluggable", async () => {
  assert.equal(await renderCard({}, { article: { slug: "a" } }), null);
  assert.equal(await renderCard({ CARD_RENDERER: "stub" }, { article: { slug: "a" } }), null);
  await assert.rejects(renderCard({ CARD_RENDERER: "canva" }, { article: { slug: "a" } }), /Unknown CARD_RENDERER/);
});
