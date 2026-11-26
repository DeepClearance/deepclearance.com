import { buildAuthorized, editorIdentity, rateLimited, recordFailure } from "./lib/auth.mjs";
import { canApprove } from "./lib/auth.mjs";
import { deployment } from "./lib/deploy.mjs";
import * as ledger from "./lib/ledger.mjs";
import { HARD_MAX_PER_HOUR, loadConfig, postingMode } from "./pipeline/config.mjs";
import { runPipeline } from "./pipeline/run.mjs";
import { gate, killSwitchOn } from "./pipeline/scheduler.mjs";
import { settingsStore } from "./pipeline/settings.mjs";
import { xRoute } from "./lib/x-publish.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const mediaPattern = /^[a-f0-9]{64}\.(png|jpg|webp)$/;
const mediaTypes = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}

function date(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(value).toISOString().slice(0, 10) === value;
}

function webUrl(value) {
  try { return ["https:", "http:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function normalize(input, slug) {
  const clean = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
  const image = input.image?.key && mediaPattern.test(input.image.key)
    ? { key: input.image.key, alt: clean(input.image.alt, 500) } : null;
  return {
    slug, title: clean(input.title, 240), summary: clean(input.summary, 500),
    date: clean(input.date, 10), xCopy: clean(input.xCopy, 3000), image,
    paragraphs: (Array.isArray(input.paragraphs) ? input.paragraphs : []).slice(0, 200)
      .map((paragraph) => clean(paragraph, 12000)).filter(Boolean),
    sources: (Array.isArray(input.sources) ? input.sources : []).slice(0, 100)
      .map((source) => ({ title: clean(source?.title, 240), url: clean(source?.url, 2000) }))
      .filter((source) => source.title || source.url),
    updates: (Array.isArray(input.updates) ? input.updates : []).slice(0, 100)
      .map((update) => ({ date: clean(update?.date, 10), text: clean(update?.text, 5000) }))
      .filter((update) => update.date || update.text),
  };
}

async function route(request, env) {
  const { pathname } = new URL(request.url);
  const method = request.method;
  if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  const build = pathname.startsWith("/api/build/");
  if (await rateLimited(request, env)) return json({ error: "Too many failed sign-ins. Try again later." }, 429);
  const identity = build ? null : await editorIdentity(request, env);
  if (build ? !(await buildAuthorized(request, env)) : !identity) {
    await recordFailure(request, env);
    return json({ error: "Access denied." }, 401);
  }

  if (pathname === "/api/editor/whoami" && method === "GET") return json(identity);
  if (pathname === "/api/editor/ledger" && method === "GET") {
    const rows = await ledger.list(env);
    if (new URL(request.url).searchParams.get("format") === "holds") {
      return new Response(rows.map(ledger.toHoldsLine).join("\n") + "\n", {
        headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return json(rows);
  }
  if (pathname === "/api/editor/quality" && method === "GET") return json(await ledger.quality(env));

  if (pathname === "/api/editor/pipeline" && method === "GET") {
    const { results: items } = await env.DB.prepare(
      "SELECT slug, status, reasons, created_at, updated_at FROM pipeline_items ORDER BY created_at DESC LIMIT 100").all();
    const { results: scheduled } = await env.DB.prepare("SELECT slug, revision, approved_at FROM scheduled_posts ORDER BY approved_at").all();
    return json({
      mode: postingMode(env), autoRequested: env.POSTING_MODE === "auto", autoEnabled: env.AUTO_POSTING_ENABLED === "true",
      killSwitch: await killSwitchOn(env), killSwitchEnv: env.POSTING_KILL_SWITCH === "on",
      cadence: loadConfig(env).cadence, hardMaxPerHour: HARD_MAX_PER_HOUR, gate: await gate(env, Date.now(), "queue"),
      lastRun: JSON.parse(await settingsStore(env).get("last_run") || "null"), items, scheduled,
    });
  }
  if (pathname === "/api/editor/kill-switch" && method === "POST") {
    const { on } = await request.json();
    if (typeof on !== "boolean") return json({ error: "Send {\"on\": true|false}." }, 400);
    // Any signed-in editor can stop posting; only a named approver can resume it.
    if (!on && !canApprove(identity, env)) return json({ error: "Only a named approver can turn posting back on." }, 403);
    const settings = settingsStore(env);
    await settings.set("kill_switch", on ? "on" : "off");
    await settings.set("kill_switch_by", `${identity.user} ${new Date().toISOString()}`);
    return json({ killSwitch: await killSwitchOn(env) });
  }

  if (pathname === "/api/build/dispatches" && method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT e.content, e.revision, e.recorded_at AS updated_at,
              (SELECT MIN(f.recorded_at) FROM editions f WHERE f.slug = e.slug AND f.published = 1) AS published_at
         FROM editions e WHERE published = 1 AND revision = (SELECT MAX(p.revision) FROM editions p WHERE p.slug = e.slug AND p.published = 1)`,
    ).all();
    return json(results.map(({ content, revision, published_at: publishedAt, updated_at: updatedAt }) => {
      const { xCopy, draftXCopy, claims, pipeline, ...article } = JSON.parse(content);
      return { ...article, revision, publishedAt, updatedAt };
    }));
  }

  if (pathname === "/api/editor/export" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM editions ORDER BY slug, revision").all();
    return json({ version: 1, editions: results.map(row => ({ ...row, content: JSON.parse(row.content) })) });
  }

  if (pathname === "/api/editor/dispatches" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT e.slug, e.content, e.revision, e.published FROM editions e WHERE e.revision = (SELECT MAX(p.revision) FROM editions p WHERE p.slug = e.slug) ORDER BY recorded_at DESC",
    ).all();
    return json(results.map(({ content, revision, published }) =>
      ({ ...JSON.parse(content), revision, published: Boolean(published) })));
  }

  if (pathname === "/api/editor/media" && method === "POST") {
    const type = request.headers.get("content-type");
    const extension = mediaTypes[type];
    if (!extension || Number(request.headers.get("content-length")) > 5_000_000) {
      return json({ error: "Use a PNG, JPEG, or WebP up to 5 MB." }, 400);
    }
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 5_000_000) return json({ error: "Invalid image size." }, 400);
    const data = new Uint8Array(bytes);
    const signature = (offset, expected) => expected.every((byte, i) => data[offset + i] === byte);
    const valid = extension === "png" ? signature(0, [137,80,78,71,13,10,26,10])
      : extension === "jpg" ? signature(0, [255,216,255])
      : signature(0, [82,73,70,70]) && signature(8, [87,69,66,80]);
    if (!valid) return json({ error: "The file does not match its image format." }, 400);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const key = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("") + "." + extension;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
    return json({ key });
  }

  const media = pathname.match(/^\/api\/(editor|build)\/media\/([^/]+)$/);
  if (media && method === "GET" && mediaPattern.test(media[2])) {
    if (build) {
      const published = await env.DB.prepare(
        "SELECT 1 FROM editions WHERE published = 1 AND json_extract(content, '$.image.key') = ? LIMIT 1",
      ).bind(media[2]).first();
      if (!published) return json({ error: "Image missing." }, 404);
    }
    const image = await env.MEDIA.get(media[2]);
    if (!image) return json({ error: "Image missing." }, 404);
    return new Response(image.body, {
      headers: { "content-type": image.httpMetadata.contentType, "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

  if (pathname === "/api/editor/deploy" && method === "POST") return json(await deployment(env));

  const distribution = pathname.match(/^\/api\/editor\/x\/([^/]+)$/);
  if (distribution && slugPattern.test(distribution[1]) && ["GET", "POST"].includes(method)) {
    return xRoute(request, env, distribution[1], json, identity, (e) => gate(e, Date.now(), "queue"));
  }

  const entry = pathname.match(/^\/api\/editor\/dispatches\/([^/]+)$/);
  if (entry && method === "PUT" && entry[1].length <= 100 && slugPattern.test(entry[1])) {
    const input = await request.json();
    const { revision, publish } = input;
    if (!Number.isSafeInteger(revision) || revision < 0 || typeof publish !== "boolean") {
      return json({ error: "Invalid revision or publish state." }, 400);
    }
    const article = normalize(input, entry[1]);
    // Pipeline metadata (drafted X copy, claim/evidence table, lead) is kept server-side across edits.
    const previous = await env.DB.prepare("SELECT content FROM editions WHERE slug = ? ORDER BY revision DESC LIMIT 1").bind(entry[1]).first();
    if (previous) {
      const { draftXCopy, claims, limits, pipeline } = JSON.parse(previous.content);
      Object.assign(article, Object.fromEntries(Object.entries({ draftXCopy, claims, limits, pipeline }).filter(([, v]) => v !== undefined)));
    }
    if (publish) {
      if (!article.title || !article.summary || !article.paragraphs.length || !date(article.date)
        || !article.sources.length || article.sources.some(source => !source.title || !webUrl(source.url))
        || article.updates.some(update => !date(update.date) || !update.text)) {
        return json({ error: "Publishing requires a headline, summary, date, article, valid sources and complete corrections." }, 400);
      }
      if (article.image && (!article.image.alt || !(await env.MEDIA.head(article.image.key)))) {
        return json({ error: "The card needs a valid upload and alt text." }, 400);
      }
    }
    const result = await env.DB.prepare(
      "INSERT INTO editions (slug, revision, published, content) SELECT ?, ?, ?, ? WHERE ? = COALESCE((SELECT MAX(revision) FROM editions WHERE slug = ?), 0)",
    ).bind(article.slug, revision + 1, Number(publish), JSON.stringify(article), revision, article.slug).run();
    if (!result.meta.changes) return json({ error: "This story changed. Reopen it before saving." }, 409);
    if (publish) {
      await env.DB.prepare("UPDATE pipeline_items SET status = 'published_manual', updated_at = ? WHERE slug = ? AND status = 'drafted'")
        .bind(new Date().toISOString(), article.slug).run();
      await ledger.record(env, { kind: "site_publish", slug: article.slug, revision: revision + 1, text: article.title,
        imageKey: article.image?.key, actor: identity.user, actorMethod: identity.method, decision: "approved", mode: "queue" });
    }
    return json({ ...article, revision: revision + 1, published: publish, deployment: publish ? await deployment(env) : null });
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runPipeline(env, controller.scheduledTime || Date.now()).catch((error) => console.error(error)));
  },
  async fetch(request, env) {
    try { return await route(request, env); }
    catch (error) {
      if (error instanceof SyntaxError || error instanceof RangeError) return json({ error: "Invalid article data." }, 400);
      console.error(error);
      return json({ error: "Newsroom request failed." }, 500);
    }
  },
};
