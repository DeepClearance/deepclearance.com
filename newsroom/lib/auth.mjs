import { digestsEqual, sha256Hex } from "./seal.mjs";

// Who is calling the editor API. Order:
// 1. Cloudflare Access: the Cf-Access-Jwt-Assertion header, verified against the team's public keys
//    (ACCESS_TEAM_DOMAIN, ACCESS_AUD). Identity = the email in the token.
// 2. Per-user editor keys: EDITOR_TOKENS secret, JSON {"name": "<sha256 hex of that person's key>"}.
// 3. Legacy shared EDITOR_TOKEN (identity "shared-editor"). It can edit, but never approve an X post.
// Failed attempts are counted per IP in D1 and blocked for the rest of a 10-minute window.

const WINDOW_SECONDS = 600;
let certCache = { domain: null, keys: null, fetched: 0 };

const b64urlBytes = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const b64urlJson = (text) => JSON.parse(new TextDecoder().decode(b64urlBytes(text)));

async function accessKeys(domain) {
  if (certCache.domain === domain && certCache.keys && Date.now() - certCache.fetched < 3600_000) return certCache.keys;
  const response = await fetch(`https://${domain}/cdn-cgi/access/certs`, { redirect: "error" });
  if (!response.ok) throw new Error("Cloudflare Access keys unavailable.");
  const { keys } = await response.json();
  certCache = { domain, keys, fetched: Date.now() };
  return keys;
}

export async function verifyAccessJwt(token, env, now = Date.now()) {
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = b64urlJson(parts[0]);
  const claims = b64urlJson(parts[1]);
  if (header.alg !== "RS256") return null;
  const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((key) => key.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const seconds = Math.floor(now / 1000);
  if (!valid || !audiences.includes(env.ACCESS_AUD) || claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`
    || !(claims.exp > seconds) || (claims.nbf && claims.nbf > seconds + 60) || !claims.email) return null;
  return { user: String(claims.email).toLowerCase(), method: "cloudflare-access" };
}

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function tokenIdentity(token, env) {
  if (!token) return null;
  const presented = await sha256Hex(token);
  let users = {};
  try { users = env.EDITOR_TOKENS ? JSON.parse(env.EDITOR_TOKENS) : {}; } catch { users = {}; }
  let match = null;
  for (const [name, digest] of Object.entries(users)) {
    if (digestsEqual(presented, String(digest).toLowerCase()) && !match) match = name;
  }
  if (match) return { user: match, method: "editor-key" };
  if (env.EDITOR_TOKEN && digestsEqual(presented, await sha256Hex(env.EDITOR_TOKEN))) {
    return { user: "shared-editor", method: "shared-key" };
  }
  return null;
}

export async function buildAuthorized(request, env) {
  return Boolean(env.BUILD_TOKEN) && digestsEqual(await sha256Hex(bearer(request)), await sha256Hex(env.BUILD_TOKEN));
}

export async function editorIdentity(request, env) {
  return (await verifyAccessJwt(request.headers.get("cf-access-jwt-assertion"), env).catch(() => null))
    || tokenIdentity(bearer(request), env);
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}

export async function rateLimited(request, env, now = Date.now()) {
  const limit = Number(env.AUTH_MAX_FAILURES || 10);
  const bucket = Math.floor(now / 1000 / WINDOW_SECONDS);
  const row = await env.DB.prepare("SELECT failures FROM auth_failures WHERE ip = ? AND bucket = ?")
    .bind(clientIp(request), bucket).first();
  return (row?.failures || 0) >= limit;
}

export async function recordFailure(request, env, now = Date.now()) {
  const bucket = Math.floor(now / 1000 / WINDOW_SECONDS);
  await env.DB.prepare(
    "INSERT INTO auth_failures (ip, bucket, failures) VALUES (?, ?, 1) ON CONFLICT(ip, bucket) DO UPDATE SET failures = failures + 1",
  ).bind(clientIp(request), bucket).run();
}

// Approvers are named people only: Access emails or EDITOR_TOKENS names listed in X_APPROVERS.
export function canApprove(identity, env) {
  if (!identity || identity.method === "shared-key") return false;
  const approvers = String(env.X_APPROVERS || "").split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
  return approvers.includes(identity.user.toLowerCase());
}
