const site = "https://deepclearance.com";
const api = "https://api.x.com/2";

async function fetchX(path, options) {
  return fetch(api + path, { ...options, signal: AbortSignal.timeout(15000), redirect: "error" });
}

async function credentials(env) {
  const stored = await env.DB.prepare("SELECT refresh_token FROM x_connection WHERE id = 1").first();
  const refreshToken = stored?.refresh_token || env.X_REFRESH_TOKEN;
  const response = await fetchX("/oauth2/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + btoa(env.X_CLIENT_ID + ":" + env.X_CLIENT_SECRET),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error("X authorization failed. Check the newsroom X connection.");
  const tokens = await response.json();
  if (tokens.refresh_token) {
    await env.DB.prepare("INSERT INTO x_connection (id, refresh_token) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET refresh_token = excluded.refresh_token")
      .bind(tokens.refresh_token).run();
  }
  if (!tokens.access_token) throw new Error("X did not return a user access token.");
  return tokens.access_token;
}

function result(row) {
  return { status: row?.status || "ready", postUrl: row?.post_id ? `https://x.com/i/web/status/${row.post_id}` : null };
}

export async function xRoute(request, env, slug, json) {
  const getStatus = () => env.DB.prepare("SELECT status, post_id FROM x_distribution WHERE slug = ?").bind(slug).first();
  const published = await env.DB.prepare(
    "SELECT revision, content FROM editions WHERE slug = ? AND published = 1 ORDER BY revision DESC LIMIT 1",
  ).bind(slug).first();
  if (!published) return json({ error: "Publish the Dispatch to the website first." }, 409);
  const article = JSON.parse(published.content);
  const url = `${site}/dispatches/${slug}/`;
  const copy = article.xCopy?.trim();
  const text = copy ? `${copy}\n\n${url}` : "";
  const status = await getStatus();
  const configured = Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET && env.X_REFRESH_TOKEN && env.X_ACCOUNT_ID);
  if (request.method === "GET") {
    return json({ ...result(status), configured, text, image: article.image, revision: published.revision });
  }

  const { revision } = await request.json();
  if (revision !== published.revision) return json({ error: "The published edition changed. Review the new X payload." }, 409);
  if (!configured) return json({ error: "The newsroom X connection has not been configured." }, 409);
  if (!text || Array.from(copy).length > 255 || !article.image?.key || !article.image.alt) {
    return json({ error: "Add short X copy and an uploaded card with alt text, then publish that edition." }, 400);
  }
  if (status && status.status !== "failed") {
    return json({ error: "This Dispatch already has a send record. Check its X status.", ...result(status) }, 409);
  }

  const page = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "error", cache: "no-store" }).catch(() => null);
  const marker = `name="dispatch-revision" content="${published.revision}"`;
  if (!page?.ok || !(await page.text()).includes(marker)) {
    return json({ error: "This edition is not live on the website yet. Check the Pages deployment and try again." }, 409);
  }

  const claim = await env.DB.prepare(
    "INSERT OR IGNORE INTO x_distribution (slug, revision, status) SELECT ?, ?, 'sending' WHERE ? = (SELECT MAX(revision) FROM editions WHERE slug = ? AND published = 1) ON CONFLICT(slug) DO UPDATE SET revision = excluded.revision, status = 'sending', updated_at = CURRENT_TIMESTAMP WHERE x_distribution.status = 'failed'",
  ).bind(slug, revision, revision, slug).run();
  if (!claim.meta.changes) return json({ error: "An X send is already active, or the edition changed." }, 409);

  const finish = (state, id = null) => env.DB.prepare(
    "UPDATE x_distribution SET status = ?, post_id = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND revision = ? AND status = 'sending'",
  ).bind(state, id, slug, revision).run();

  let submitted = false;
  try {
    const accessToken = await credentials(env);
    const headers = { authorization: `Bearer ${accessToken}` };
    const who = await fetchX("/users/me", { headers });
    if (!who.ok || (await who.json()).data?.id !== env.X_ACCOUNT_ID) throw new Error("The authorized X account does not match Deep Clearance.");
    const card = await env.MEDIA.get(article.image.key);
    if (!card) throw new Error("The approved card is missing.");
    const media = new FormData();
    media.set("media_category", "tweet_image");
    media.set("media", new Blob([await card.arrayBuffer()], { type: card.httpMetadata.contentType }), article.image.key);
    const upload = await fetchX("/media/upload", { method: "POST", headers, body: media });
    const mediaId = upload.ok ? (await upload.json()).data?.id : null;
    if (!mediaId) throw new Error("X did not accept the card upload.");
    const jsonHeaders = { ...headers, "content-type": "application/json" };
    const alt = await fetchX("/media/metadata", { method: "POST", headers: jsonHeaders,
      body: JSON.stringify({ id: mediaId, metadata: { alt_text: { text: article.image.alt } } }),
    });
    if (!alt.ok) throw new Error("X did not accept the card alt text.");

    submitted = true;
    const response = await fetchX("/tweets", {
      method: "POST", headers: jsonHeaders,
      body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
    });
    if ([400, 401, 403, 404, 422, 429].includes(response.status)) {
      submitted = false;
      throw new Error(`X rejected the post (HTTP ${response.status}).`);
    }
    const id = response.ok ? (await response.json()).data?.id : null;
    if (typeof id !== "string" || !/^\d+$/.test(id)) throw new Error("X returned no confirmed post ID.");
    await finish("posted", id);
    return json(result({ status: "posted", post_id: id }));
  } catch (error) {
    await finish(submitted ? "uncertain" : "failed");
    return json({ error: submitted
      ? "X may have received the post. Check the account before any manual recovery."
      : error.message }, 502);
  }
}
