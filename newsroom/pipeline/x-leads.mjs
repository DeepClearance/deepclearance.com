import { isPrimaryUrl } from "./config.mjs";

// Reads recent posts from fast lead accounts (read-only, app bearer token X_BEARER_TOKEN).
// A post is only a pointer: it becomes a lead only when it links to an allowed primary-source domain,
// and the lead's URL is that primary source, never the X post.
export async function readLeadAccounts(env, accounts, primaryDomains, settings) {
  if (!env.X_BEARER_TOKEN || !accounts.length) return [];
  const leads = [];
  for (const account of accounts) {
    const key = `x_since:${account.id}`;
    const since = await settings.get(key);
    const params = new URLSearchParams({ max_results: "20", exclude: "retweets,replies", "tweet.fields": "created_at,entities" });
    if (since) params.set("since_id", since);
    const response = await fetch(`https://api.x.com/2/users/${account.id}/tweets?${params}`, {
      headers: { authorization: `Bearer ${env.X_BEARER_TOKEN}` }, signal: AbortSignal.timeout(15000), redirect: "error",
    });
    if (response.status === 429) break;
    if (!response.ok) continue;
    const body = await response.json();
    if (body.meta?.newest_id) await settings.set(key, body.meta.newest_id);
    for (const post of body.data || []) {
      const url = (post.entities?.urls || []).map((entry) => entry.unwound_url || entry.expanded_url)
        .find((link) => isPrimaryUrl(link, primaryDomains));
      if (!url) continue;
      leads.push({ sourceId: `x:${account.username}`, kind: "x", url, title: post.text.replace(/https:\/\/t\.co\/\S+/g, "").trim(),
        summary: "", publishedAt: post.created_at || null, via: `https://x.com/${account.username}/status/${post.id}` });
    }
  }
  return leads;
}
