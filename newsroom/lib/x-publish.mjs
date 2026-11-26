import { canApprove } from "./auth.mjs";
import * as ledger from "./ledger.mjs";
import { seal, unseal } from "./seal.mjs";
import { checkPost, composePost } from "./x-text.mjs";

const site = "https://deepclearance.com";
const api = "https://api.x.com/2";
const TOKEN_LABEL = "x_token:1";

async function fetchX(path, options) {
  return fetch(api + path, { ...options, signal: AbortSignal.timeout(15000), redirect: "error" });
}

export function xConfigured(env) {
  return Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET && env.X_REFRESH_TOKEN && env.X_ACCOUNT_ID && env.X_TOKEN_KEY);
}

// X refresh tokens are single-use: every refresh returns a new one, which must be stored before the
// next call. The current token is kept sealed in D1 (strongly consistent, unlike KV) under X_TOKEN_KEY.
// X_REFRESH_TOKEN (Worker secret) is only the seed used until the first rotation.
async function credentials(env) {
  const stored = await env.DB.prepare("SELECT iv, ciphertext FROM x_token WHERE id = 1").first();
  const refreshToken = stored ? await unseal(env.X_TOKEN_KEY, stored, TOKEN_LABEL) : env.X_REFRESH_TOKEN;
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
    const sealed = await seal(env.X_TOKEN_KEY, tokens.refresh_token, TOKEN_LABEL);
    await env.DB.prepare(
      "INSERT INTO x_token (id, iv, ciphertext) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET iv = excluded.iv, ciphertext = excluded.ciphertext, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    ).bind(sealed.iv, sealed.ciphertext).run();
  }
  if (!tokens.access_token) throw new Error("X did not return a user access token.");
  return tokens.access_token;
}

function result(row) {
  return { status: row?.status || "ready", postUrl: row?.post_id ? `https://x.com/i/web/status/${row.post_id}` : null };
}

export async function latestPublished(env, slug) {
  const published = await env.DB.prepare(
    "SELECT revision, content FROM editions WHERE slug = ? AND published = 1 ORDER BY revision DESC LIMIT 1",
  ).bind(slug).first();
  if (!published) return null;
  const article = JSON.parse(published.content);
  const url = `${site}/dispatches/${slug}/`;
  return { revision: published.revision, article, url, text: composePost(article.xCopy, url) };
}

export async function editionIsLive(url, revision) {
  const page = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "error", cache: "no-store" }).catch(() => null);
  return Boolean(page?.ok) && (await page.text()).includes(`name="dispatch-revision" content="${revision}"`);
}

// Claims the single send slot, uploads the optional card, posts, and records the outcome.
// Returns { ok, status, postId?, error? }. Callers must have written a ledger row first.
export async function sendPost(env, { slug, revision, text, image }) {
  const claim = await env.DB.prepare(
    "INSERT OR IGNORE INTO x_distribution (slug, revision, status) SELECT ?, ?, 'sending' WHERE ? = (SELECT MAX(revision) FROM editions WHERE slug = ? AND published = 1) ON CONFLICT(slug) DO UPDATE SET revision = excluded.revision, status = 'sending', updated_at = CURRENT_TIMESTAMP WHERE x_distribution.status = 'failed'",
  ).bind(slug, revision, revision, slug).run();
  if (!claim.meta.changes) return { ok: false, status: "busy", error: "An X send is already active, or the edition changed." };

  const finish = (state, id = null) => env.DB.prepare(
    "UPDATE x_distribution SET status = ?, post_id = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND revision = ? AND status = 'sending'",
  ).bind(state, id, slug, revision).run();

  let submitted = false;
  try {
    const accessToken = await credentials(env);
    const headers = { authorization: `Bearer ${accessToken}` };
    const who = await fetchX("/users/me", { headers });
    if (!who.ok || (await who.json()).data?.id !== env.X_ACCOUNT_ID) throw new Error("The authorized X account does not match Deep Clearance.");
    const jsonHeaders = { ...headers, "content-type": "application/json" };
    let mediaIds = [];
    if (image?.key) {
      const card = await env.MEDIA.get(image.key);
      if (!card) throw new Error("The approved card is missing.");
      const media = new FormData();
      media.set("media_category", "tweet_image");
      media.set("media", new Blob([await card.arrayBuffer()], { type: card.httpMetadata.contentType }), image.key);
      const upload = await fetchX("/media/upload", { method: "POST", headers, body: media });
      const mediaId = upload.ok ? (await upload.json()).data?.id : null;
      if (!mediaId) throw new Error("X did not accept the card upload.");
      const alt = await fetchX("/media/metadata", { method: "POST", headers: jsonHeaders,
        body: JSON.stringify({ id: mediaId, metadata: { alt_text: { text: image.alt } } }),
      });
      if (!alt.ok) throw new Error("X did not accept the card alt text.");
      mediaIds = [mediaId];
    }
    submitted = true;
    const response = await fetchX("/tweets", {
      method: "POST", headers: jsonHeaders,
      body: JSON.stringify(mediaIds.length ? { text, media: { media_ids: mediaIds } } : { text }),
    });
    if ([400, 401, 403, 404, 422, 429].includes(response.status)) {
      submitted = false;
      throw new Error(`X rejected the post (HTTP ${response.status}).`);
    }
    const id = response.ok ? (await response.json()).data?.id : null;
    if (typeof id !== "string" || !/^\d+$/.test(id)) throw new Error("X returned no confirmed post ID.");
    await finish("posted", id);
    return { ok: true, status: "posted", postId: id };
  } catch (error) {
    await finish(submitted ? "uncertain" : "failed");
    return { ok: false, status: submitted ? "uncertain" : "failed",
      error: submitted ? "X may have received the post. Check the account before any manual recovery." : error.message };
  }
}

export async function xRoute(request, env, slug, json, identity, gate = async () => null) {
  const getStatus = () => env.DB.prepare("SELECT status, post_id FROM x_distribution WHERE slug = ?").bind(slug).first();
  const edition = await latestPublished(env, slug);
  if (!edition) return json({ error: "Publish the Dispatch to the website first." }, 409);
  const { article, revision, text } = edition;
  const status = await getStatus();
  const check = checkPost(text);
  if (request.method === "GET") {
    return json({ ...result(status), configured: xConfigured(env), text, length: check.length, maxLength: check.max,
      image: article.image, revision, canApprove: canApprove(identity, env) });
  }

  const body = await request.json();
  if (!canApprove(identity, env)) return json({ error: "Only a named approver listed in X_APPROVERS can decide on X posts." }, 403);
  if (body.revision !== revision) return json({ error: "The published edition changed. Review the new X payload." }, 409);
  if (body.text !== text) return json({ error: "The X text changed since you reviewed it. Review it again." }, 409);
  const entry = { kind: "x_post", slug, revision, text, imageKey: article.image?.key, actor: identity.user,
    actorMethod: identity.method, mode: "queue", note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
    draftedText: article.draftXCopy ? composePost(article.draftXCopy, edition.url) : null };

  if (body.decision === "reject") {
    const { ref } = await ledger.record(env, { ...entry, decision: "rejected" });
    return json({ ...result(status), decision: "rejected", ref });
  }
  if (body.decision !== "approve") return json({ error: "Decision must be approve or reject." }, 400);
  if (!xConfigured(env)) return json({ error: "The newsroom X connection has not been configured." }, 409);
  if (!check.ok) return json({ error: `The X post is ${check.length} of ${check.max} weighted characters (links count as 23). Shorten the X copy and publish that edition.` }, 400);
  if (article.image && !article.image.alt) return json({ error: "The card needs alt text." }, 400);
  if (status && status.status !== "failed") {
    return json({ error: "This Dispatch already has a send record. Check its X status.", ...result(status) }, 409);
  }
  const blocked = await gate(env, { slug, revision });
  if (blocked) return json({ error: blocked }, 409);
  if (!(await editionIsLive(edition.url, revision))) {
    return json({ error: "This edition is not live on the website yet. Check the Pages deployment and try again." }, 409);
  }

  const approval = await ledger.record(env, { ...entry, decision: "approved" });
  const sent = await sendPost(env, { slug, revision, text, image: article.image });
  await ledger.setOutcome(env, approval.id, sent.status, sent.postId || null);
  if (!sent.ok) return json({ error: sent.error, ref: approval.ref }, sent.status === "busy" ? 409 : 502);
  return json({ ...result({ status: "posted", post_id: sent.postId }), ref: approval.ref });
}
