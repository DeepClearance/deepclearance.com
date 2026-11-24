import { xRoute } from "./x-publish.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const mediaPattern = /^[a-f0-9]{64}\.(png|jpg|webp)$/;
const mediaTypes = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}

async function authorized(request, secret) {
  if (!secret) return false;
  const encode = (value) => new TextEncoder().encode(value);
  const hash = (value) => crypto.subtle.digest("SHA-256", encode(value));
  const [actual, expected] = await Promise.all([
    hash(request.headers.get("authorization") || ""), hash(`Bearer ${secret}`),
  ]);
  return new Uint8Array(actual).reduce((diff, byte, index) =>
    diff | (byte ^ new Uint8Array(expected)[index]), 0) === 0;
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

async function deployment(env) {
  if (!env.GITHUB_PUBLISH_TOKEN) return { queued: false };
  try {
    const response = await fetch(
      "https://api.github.com/repos/DeepClearance/deepclearance.com/actions/workflows/static.yml/dispatches",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.GITHUB_PUBLISH_TOKEN}`,
          accept: "application/vnd.github+json",
          "user-agent": "DeepClearance-Newsroom",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    return { queued: response.ok, status: response.status };
  } catch { return { queued: false }; }
}

async function route(request, env) {
  const { pathname } = new URL(request.url);
  const method = request.method;
  if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  const build = pathname.startsWith("/api/build/");
  if (!(await authorized(request, build ? env.BUILD_TOKEN : env.EDITOR_TOKEN))) {
    return json({ error: "Access denied." }, 401);
  }

  if (pathname === "/api/build/dispatches" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT e.content, e.revision FROM editions e WHERE published = 1 AND revision = (SELECT MAX(p.revision) FROM editions p WHERE p.slug = e.slug AND p.published = 1)",
    ).all();
    return json(results.map(({ content, revision }) => {
      const { xCopy, ...article } = JSON.parse(content);
      return { ...article, revision };
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
    return xRoute(request, env, distribution[1], json);
  }

  const entry = pathname.match(/^\/api\/editor\/dispatches\/([^/]+)$/);
  if (entry && method === "PUT" && entry[1].length <= 100 && slugPattern.test(entry[1])) {
    const input = await request.json();
    const { revision, publish } = input;
    if (!Number.isSafeInteger(revision) || revision < 0 || typeof publish !== "boolean") {
      return json({ error: "Invalid revision or publish state." }, 400);
    }
    const article = normalize(input, entry[1]);
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
    return json({ ...article, revision: revision + 1, published: publish, deployment: publish ? await deployment(env) : null });
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    try { return await route(request, env); }
    catch (error) {
      if (error instanceof SyntaxError || error instanceof RangeError) return json({ error: "Invalid article data." }, 400);
      console.error(error);
      return json({ error: "Newsroom request failed." }, 500);
    }
  },
};
