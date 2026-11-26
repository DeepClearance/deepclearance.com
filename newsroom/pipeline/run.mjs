import { deployment } from "../lib/deploy.mjs";
import * as ledger from "../lib/ledger.mjs";
import { dispatchScheduled, editionIsLive, latestPublished, sendPost } from "../lib/x-publish.mjs";
import { renderCard } from "./cards.mjs";
import { isPrimaryUrl, loadConfig, postingMode } from "./config.mjs";
import { storeLead } from "./dedup.mjs";
import { draftFromEvidence } from "./draft.mjs";
import { fetchEvidence } from "./evidence.mjs";
import { fetchFeed } from "./feeds.mjs";
import { checkDraft } from "./guardrails.mjs";
import { llmConfigured } from "./llm.mjs";
import { gate, killSwitchOn } from "./scheduler.mjs";
import { settingsStore } from "./settings.mjs";
import { readLeadAccounts } from "./x-leads.mjs";

const PIPELINE_ACTOR = { actor: "pipeline", actorMethod: "cron" };
const paramariboDate = (ms) => new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);

// 1. Monitor: every configured feed, plus one lead account per run (round robin) when X_BEARER_TOKEN is set.
export async function monitor(env, now) {
  const config = loadConfig(env);
  const settings = settingsStore(env);
  const report = { feeds: 0, feedErrors: [], newLeads: 0 };
  const candidates = [];
  for (const source of config.sources) {
    try {
      for (const item of await fetchFeed(source)) candidates.push({ ...item, sourceId: source.id, kind: "feed" });
      report.feeds++;
    } catch (error) { report.feedErrors.push(`${source.id}: ${error.message}`); }
  }
  if (config.leadAccounts.length) {
    const turn = Number(await settings.get("x_lead_turn") || 0) % config.leadAccounts.length;
    await settings.set("x_lead_turn", turn + 1);
    candidates.push(...await readLeadAccounts(env, [config.leadAccounts[turn]], config.primaryDomains, settings).catch(() => []));
  }
  const maxAge = now - config.cadence.leadMaxAgeHours * 3600_000;
  for (const lead of candidates) {
    if (lead.publishedAt && Date.parse(lead.publishedAt) < maxAge) continue;
    if (!isPrimaryUrl(lead.url, config.primaryDomains)) continue;
    if (await storeLead(env, lead, now)) report.newLeads++;
  }
  return report;
}

async function uniqueSlug(env, slug) {
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? slug : `${slug.slice(0, 95)}-${n}`;
    const taken = await env.DB.prepare("SELECT 1 FROM editions WHERE slug = ? UNION SELECT 1 FROM pipeline_items WHERE slug = ? LIMIT 1")
      .bind(candidate, candidate).first();
    if (!taken) return candidate;
  }
  throw new Error("No free slug.");
}

// 2. Draft: newest leads first, at most draftsPerRun. No LLM key means no drafts.
export async function draftLeads(env, now) {
  if (!llmConfigured(env)) return { drafted: 0, blocked: 0, skipped: "no LLM configured" };
  const config = loadConfig(env);
  const { results } = await env.DB.prepare("SELECT * FROM leads WHERE status = 'new' ORDER BY id DESC LIMIT ?")
    .bind(config.cadence.draftsPerRun).all();
  const report = { drafted: 0, blocked: 0, failed: 0 };
  for (const lead of results) {
    const mark = (status, reason = null) => env.DB.prepare("UPDATE leads SET status = ?, reason = ? WHERE id = ?").bind(status, reason, lead.id).run();
    try {
      const evidence = [await fetchEvidence(lead.url, () => new Date(now))];
      if (!evidence[0].ok || !evidence[0].text) { await mark("skipped", `source returned ${evidence[0].status}`); continue; }
      const draft = await draftFromEvidence(env, lead, evidence);
      if (!draft) { await mark("skipped", "no LLM configured"); continue; }
      const check = checkDraft(draft, evidence, config);
      const slug = await uniqueSlug(env, check.ok ? draft.slug : `blocked-${lead.id}`);
      const article = {
        slug, title: String(draft.title).slice(0, 240), summary: String(draft.summary).slice(0, 500), date: paramariboDate(now),
        paragraphs: draft.paragraphs?.map((p) => String(p).slice(0, 12000)) || [],
        sources: [...new Map(check.claims.filter((c) => c.primary).map((c) => [c.sourceUrl, { title: `${lead.source_id} · ${c.fetchedAt.slice(0, 10)}`, url: c.sourceUrl }])).values()],
        updates: [], xCopy: String(draft.xCopy || "").slice(0, 3000), draftXCopy: String(draft.xCopy || "").slice(0, 3000),
        claims: check.claims, limits: String(draft.limits || "").slice(0, 2000), image: null,
        pipeline: { leadId: lead.id, leadUrl: lead.url, via: lead.via, sourceId: lead.source_id, draftedAt: new Date(now).toISOString(), model: `${env.LLM_PROVIDER}:${env.LLM_MODEL}` },
      };
      if (check.ok) article.image = await renderCard(env, { article, claims: check.claims });
      const stamp = new Date(now).toISOString();
      await env.DB.prepare("INSERT INTO pipeline_items (slug, lead_id, status, reasons, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(slug, lead.id, check.ok ? "drafted" : "blocked", JSON.stringify(check.reasons), JSON.stringify(article), stamp, stamp).run();
      if (check.ok) {
        await env.DB.prepare("INSERT INTO editions (slug, revision, published, content) VALUES (?, 1, 0, ?)").bind(slug, JSON.stringify(article)).run();
        await mark("drafted");
        report.drafted++;
      } else {
        await mark("blocked", check.reasons.join(" "));
        report.blocked++;
      }
    } catch (error) {
      await mark("failed", String(error.message).slice(0, 500));
      report.failed++;
    }
  }
  return report;
}

async function setItem(env, slug, status) {
  await env.DB.prepare("UPDATE pipeline_items SET status = ?, updated_at = ? WHERE slug = ?").bind(status, new Date().toISOString(), slug).run();
}

// 3. Auto mode only (POSTING_MODE=auto AND AUTO_POSTING_ENABLED=true): publish one passing draft per run
// within the daily target, then post editions once they are live, inside the cadence gate.
export async function autoAdvance(env, now) {
  const report = { published: null, posted: null };
  const { cadence } = loadConfig(env);
  const settings = settingsStore(env);
  const live = await env.DB.prepare("SELECT slug FROM pipeline_items WHERE status = 'published' ORDER BY updated_at LIMIT 1").first();
  if (live && !(await gate(env, now, "auto"))) {
    const edition = await latestPublished(env, live.slug);
    if (edition && await editionIsLive(edition.url, edition.revision)) {
      const approval = await ledger.record(env, { kind: "x_post", slug: live.slug, revision: edition.revision, text: edition.text,
        imageKey: edition.article.image?.key, ...PIPELINE_ACTOR, decision: "auto", mode: "auto",
        draftedText: edition.text });
      const sent = await sendPost(env, { slug: live.slug, revision: edition.revision, text: edition.text, image: edition.article.image });
      await ledger.setOutcome(env, approval.id, sent.status, sent.postId || null);
      await setItem(env, live.slug, sent.ok ? "posted" : "failed");
      report.posted = { slug: live.slug, status: sent.status };
    }
  }
  const publishedToday = (await env.DB.prepare("SELECT COUNT(*) AS n FROM pipeline_items WHERE status IN ('published','posted') AND updated_at >= ?")
    .bind(new Date(now - 86400_000).toISOString()).first()).n;
  const next = await env.DB.prepare("SELECT slug FROM pipeline_items WHERE status = 'drafted' ORDER BY created_at DESC LIMIT 1").first();
  if (next && publishedToday < cadence.postsPerDay) {
    const draft = await env.DB.prepare("SELECT revision, content FROM editions WHERE slug = ? ORDER BY revision DESC LIMIT 1").bind(next.slug).first();
    const result = await env.DB.prepare(
      "INSERT INTO editions (slug, revision, published, content) SELECT ?, ?, 1, ? WHERE ? = (SELECT MAX(revision) FROM editions WHERE slug = ?)",
    ).bind(next.slug, draft.revision + 1, draft.content, draft.revision, next.slug).run();
    if (result.meta.changes) {
      await ledger.record(env, { kind: "site_publish", slug: next.slug, revision: draft.revision + 1, text: JSON.parse(draft.content).title,
        ...PIPELINE_ACTOR, decision: "auto", mode: "auto" });
      await setItem(env, next.slug, "published");
      await settings.set("pending_deploy", "1");
      report.published = next.slug;
    }
  }
  return report;
}

// 4. One Pages deploy per deployMinGapMinutes, however many editions were published.
export async function flushDeploy(env, now) {
  const settings = settingsStore(env);
  if (await settings.get("pending_deploy") !== "1") return null;
  const last = Number(await settings.get("last_deploy_at") || 0);
  if (now - last < loadConfig(env).cadence.deployMinGapMinutes * 60_000) return null;
  const result = await deployment(env);
  if (result.queued) {
    await settings.set("pending_deploy", "0");
    await settings.set("last_deploy_at", now);
  }
  return result;
}

export async function runPipeline(env, now = Date.now()) {
  const mode = postingMode(env);
  const report = { mode, killSwitch: await killSwitchOn(env) };
  report.monitor = await monitor(env, now);
  report.draft = await draftLeads(env, now);
  if (!report.killSwitch) {
    report.scheduled = await dispatchScheduled(env, (e) => gate(e, now, "queue"));
    if (mode === "auto") report.auto = await autoAdvance(env, now);
  }
  report.deploy = await flushDeploy(env, now);
  await settingsStore(env).set("last_run", JSON.stringify({ at: new Date(now).toISOString(), ...report }));
  return report;
}
