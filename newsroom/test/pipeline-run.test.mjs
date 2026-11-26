import assert from "node:assert/strict";
import test from "node:test";
import { runPipeline } from "../pipeline/run.mjs";
import worker from "../worker.mjs";
import { d1, sha256, strictFetch, tokenKey } from "./helpers.mjs";

const SOURCE_URL = "https://www.sec.gov/newsroom/press-releases/2026-99";
const SOURCE_HTML = "<html><body><p>The Securities and Exchange Commission today charged Example Corp. with misleading investors about its reserves.</p></body></html>";
const FEED = `<rss><channel>
<item><title>SEC Charges Example Corp. With Misleading Investors</title><link>${SOURCE_URL}?utm_source=rss</link><pubDate>${new Date(Date.now() - 3600_000).toUTCString()}</pubDate></item>
<item><title>SEC Charges Example Corp. With Misleading Investors</title><link>${SOURCE_URL}</link><pubDate>${new Date(Date.now() - 3600_000).toUTCString()}</pubDate></item>
<item><title>Old item</title><link>https://www.sec.gov/old</link><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;
const LLM_REPLY = {
  slug: "sec-charges-example-corp", title: "SEC charges Example Corp. over reserve disclosures", summary: "The SEC filed charges today.",
  paragraphs: ["The Securities and Exchange Commission charged Example Corp. with misleading investors about its reserves."],
  xCopy: "The SEC charged Example Corp. with misleading investors about its reserves, according to the agency's release.",
  claims: [{ claim: "The SEC charged Example Corp.", quote: "today charged Example Corp. with misleading investors", sourceUrl: SOURCE_URL }],
  limits: "The release states allegations; no court has ruled.",
};

async function environment(t, overrides = {}) {
  const DB = d1("schema.sql", "x-schema.sql", "pipeline-schema.sql");
  const calls = { llm: 0, x: [], github: 0, live: false, xReads: 0 };
  strictFetch(t, async (url, init = {}) => {
    if (url === "https://feeds.example.gov/sec.rss") return new Response(FEED, { headers: { "content-type": "application/rss+xml" } });
    if (url === SOURCE_URL) return new Response(SOURCE_HTML, { headers: { "content-type": "text/html" } });
    if (url === "https://api.openai.com/v1/chat/completions") {
      calls.llm++;
      assert.equal(init.headers.authorization, "Bearer llm-key");
      return Response.json({ choices: [{ message: { content: JSON.stringify(LLM_REPLY) } }] });
    }
    if (url.startsWith("https://api.github.com/")) { calls.github++; return new Response(null, { status: 204 }); }
    if (url.startsWith("https://deepclearance.com/dispatches/")) {
      return new Response(calls.live ? '<meta name="dispatch-revision" content="2">' : "", { status: calls.live ? 200 : 404 });
    }
    if (url.startsWith("https://api.x.com/2/users/") && url.includes("/tweets")) {
      calls.xReads++;
      assert.equal(init.headers.authorization, "Bearer app-bearer");
      return Response.json({ data: [
        { id: "1", text: "JUST IN: market moves https://t.co/a", entities: { urls: [{ expanded_url: "https://kalshi.com/markets/x" }] } },
        { id: "2", text: "Fed statement https://t.co/b", created_at: new Date().toISOString(), entities: { urls: [{ expanded_url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20261126a.htm" }] } },
      ], meta: { newest_id: "2" } });
    }
    if (url.startsWith("https://api.x.com/")) {
      calls.x.push(url);
      if (url.endsWith("/oauth2/token")) return Response.json({ access_token: "user", refresh_token: "next" });
      if (url.endsWith("/users/me")) return Response.json({ data: { id: "123" } });
      if (url.endsWith("/tweets")) return Response.json({ data: { id: "999" } }, { status: 201 });
    }
    if (url.startsWith("https://www.federalreserve.gov/")) return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
  });
  const env = {
    DB, SOURCES_JSON: JSON.stringify([{ id: "sec-press", name: "SEC", kind: "feed", url: "https://feeds.example.gov/sec.rss" }]),
    LEAD_ACCOUNTS_JSON: "[]", LLM_PROVIDER: "openai", LLM_MODEL: "test-model", LLM_API_KEY: "llm-key",
    GITHUB_PUBLISH_TOKEN: "gh", X_CLIENT_ID: "c", X_CLIENT_SECRET: "s", X_REFRESH_TOKEN: "r", X_ACCOUNT_ID: "123", X_TOKEN_KEY: tokenKey(),
    EDITOR_TOKENS: JSON.stringify({ josh: await sha256("josh-key") }), X_APPROVERS: "josh",
    ...overrides,
  };
  return { env, DB, calls };
}

test("queue mode: monitors, dedups, drafts with a claim/evidence table, publishes and posts nothing", async (t) => {
  const { env, DB, calls } = await environment(t, { POSTING_MODE: "auto" }); // auto requested but not enabled
  const report = await runPipeline(env);
  assert.equal(report.mode, "queue");
  assert.equal(report.monitor.newLeads, 1);
  assert.equal(report.draft.drafted, 1);
  const edition = DB.sql.prepare("SELECT * FROM editions").get();
  assert.equal(edition.published, 0);
  const article = JSON.parse(edition.content);
  assert.equal(article.claims[0].sourceUrl, SOURCE_URL);
  assert.match(article.claims[0].sha256, /^[0-9a-f]{64}$/);
  assert.ok(article.claims[0].fetchedAt && article.claims[0].quoteFound && article.claims[0].primary);
  assert.equal(article.draftXCopy, LLM_REPLY.xCopy);
  assert.deepEqual(calls.x, []);
  assert.equal(calls.github, 0);
  await runPipeline(env);
  assert.equal(calls.llm, 1, "the same lead is never drafted twice");
});

test("no LLM key: nothing is drafted", async (t) => {
  const { env, DB, calls } = await environment(t, { LLM_API_KEY: "" });
  const report = await runPipeline(env);
  assert.equal(report.draft.drafted, 0);
  assert.equal(calls.llm, 0);
  assert.equal(DB.sql.prepare("SELECT COUNT(*) AS n FROM editions").get().n, 0);
});

test("lead accounts only yield leads that link to primary sources", async (t) => {
  const { env, DB, calls } = await environment(t, { SOURCES_JSON: "[]", X_BEARER_TOKEN: "app-bearer",
    LEAD_ACCOUNTS_JSON: JSON.stringify([{ id: "1071484733543079936", username: "Kalshi" }]) });
  await runPipeline(env);
  assert.equal(calls.xReads, 1);
  const leads = DB.sql.prepare("SELECT url, via, kind, status FROM leads").all();
  assert.equal(leads.length, 1);
  assert.match(leads[0].url, /federalreserve\.gov/);
  assert.equal(leads[0].via, "https://x.com/Kalshi/status/2");
  assert.equal(leads[0].status, "skipped", "a source that does not load is never drafted");
  assert.deepEqual(calls.x, []);
});

test("auto mode needs both switches, debounces deploys, posts within the gate, and honours the kill switch", async (t) => {
  const { env, DB, calls } = await environment(t, { POSTING_MODE: "auto", AUTO_POSTING_ENABLED: "true",
    CADENCE_JSON: JSON.stringify({ quietHoursUtc: [0, 0], peakWindowsUtc: [[0, 24]] }) });
  const first = await runPipeline(env);
  assert.equal(first.auto.published, "sec-charges-example-corp");
  assert.equal(calls.github, 1);
  assert.equal((await runPipeline(env)).deploy, null, "no second deploy inside the gap");
  assert.deepEqual(calls.x, [], "nothing is posted before the edition is live");

  await worker.fetch(new Request("https://n.example/api/editor/kill-switch", { method: "POST",
    headers: { authorization: "Bearer josh-key" }, body: JSON.stringify({ on: true }) }), env);
  calls.live = true;
  await runPipeline(env);
  assert.deepEqual(calls.x, [], "kill switch stops posting");

  await worker.fetch(new Request("https://n.example/api/editor/kill-switch", { method: "POST",
    headers: { authorization: "Bearer josh-key" }, body: JSON.stringify({ on: false }) }), env);
  const posted = await runPipeline(env);
  assert.deepEqual(posted.auto.posted, { slug: "sec-charges-example-corp", status: "posted" });
  const row = DB.sql.prepare("SELECT * FROM approvals WHERE kind = 'x_post'").get();
  assert.equal(row.decision, "auto");
  assert.equal(row.actor, "pipeline");
  assert.equal(row.outcome, "posted");
  assert.equal(row.post_id, "999");
});

test("queue approvals over the hourly cap are recorded and sent later; edits show in the quality report", async (t) => {
  const { env, DB, calls } = await environment(t, { CADENCE_JSON: JSON.stringify({ maxPerHour: 1, minGapMinutes: 0 }) });
  await runPipeline(env);
  const call = (path, init = {}) => worker.fetch(new Request(`https://n.example/api/editor/${path}`,
    { ...init, headers: { authorization: "Bearer josh-key", ...init.headers } }), env);
  // Josh edits the drafted X copy and publishes the edition himself.
  const draft = JSON.parse(DB.sql.prepare("SELECT content FROM editions").get().content);
  const saved = await call("dispatches/sec-charges-example-corp", { method: "PUT", body: JSON.stringify({ ...draft, revision: 1, publish: true,
    xCopy: "The SEC charged Example Corp. with misleading investors about its reserves." }) });
  assert.equal(saved.status, 200);
  const kept = JSON.parse(DB.sql.prepare("SELECT content FROM editions WHERE revision = 2").get().content);
  assert.equal(kept.draftXCopy, LLM_REPLY.xCopy, "pipeline metadata survives editor saves");
  assert.equal(DB.sql.prepare("SELECT status FROM pipeline_items").get().status, "published_manual");

  DB.sql.prepare("INSERT INTO x_distribution (slug, revision, status, post_id) VALUES ('other', 1, 'posted', '1')").run();
  const review = await (await call("x/sec-charges-example-corp")).json();
  const approved = await (await call("x/sec-charges-example-corp", { method: "POST",
    body: JSON.stringify({ revision: 2, text: review.text, decision: "approve" }) })).json();
  assert.equal(approved.status, "scheduled");
  assert.deepEqual(calls.x, []);

  DB.sql.prepare("UPDATE x_distribution SET updated_at = datetime('now', '-2 hours')").run();
  calls.live = true;
  const run = await runPipeline(env);
  assert.deepEqual(run.scheduled, { slug: "sec-charges-example-corp", status: "posted" });
  const ledgerRow = DB.sql.prepare("SELECT * FROM approvals WHERE kind = 'x_post'").get();
  assert.equal(ledgerRow.outcome, "posted");
  const quality = await (await call("quality")).json();
  assert.equal(quality.totals.approved_after_edit, 1);
  assert.equal(quality.totals.approved_as_drafted, 0);
});
