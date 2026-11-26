import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker.mjs";
import { d1, strictFetch } from "./helpers.mjs";

const b64url = (data) => Buffer.from(data).toString("base64url");

async function accessFixture(t) {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "k1" };
  strictFetch(t, async (url) => url === "https://dc.cloudflareaccess.com/cdn-cgi/access/certs" ? Response.json({ keys: [jwk] }) : null);
  const sign = async (claims) => {
    const head = b64url(JSON.stringify({ alg: "RS256", kid: "k1" }));
    const body = b64url(JSON.stringify(claims));
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(`${head}.${body}`));
    return `${head}.${body}.${b64url(sig)}`;
  };
  return sign;
}

const whoami = (env, headers) => worker.fetch(new Request("https://newsroom.example/api/editor/whoami", { headers }), env);

test("Cloudflare Access tokens are verified for signature, audience, issuer and expiry", async (t) => {
  const sign = await accessFixture(t);
  const env = { DB: d1("schema.sql", "x-schema.sql"), ACCESS_TEAM_DOMAIN: "dc.cloudflareaccess.com", ACCESS_AUD: "aud-1" };
  const exp = Math.floor(Date.now() / 1000) + 600;
  const good = await sign({ aud: ["aud-1"], iss: "https://dc.cloudflareaccess.com", exp, email: "Josh@Example.com" });
  assert.deepEqual(await (await whoami(env, { "cf-access-jwt-assertion": good })).json(), { user: "josh@example.com", method: "cloudflare-access" });
  const wrongAud = await sign({ aud: ["other"], iss: "https://dc.cloudflareaccess.com", exp, email: "a@b.c" });
  assert.equal((await whoami(env, { "cf-access-jwt-assertion": wrongAud })).status, 401);
  const expired = await sign({ aud: ["aud-1"], iss: "https://dc.cloudflareaccess.com", exp: 1, email: "a@b.c" });
  assert.equal((await whoami(env, { "cf-access-jwt-assertion": expired })).status, 401);
  const forged = good.slice(0, -4) + "AAAA";
  assert.equal((await whoami(env, { "cf-access-jwt-assertion": forged })).status, 401);
});

test("failed sign-ins are rate limited per IP", async (t) => {
  strictFetch(t, async () => null);
  const env = { DB: d1("schema.sql", "x-schema.sql"), EDITOR_TOKEN: "right", AUTH_MAX_FAILURES: "3" };
  const headers = (key, ip = "1.1.1.1") => ({ authorization: `Bearer ${key}`, "cf-connecting-ip": ip });
  for (let i = 0; i < 3; i++) assert.equal((await whoami(env, headers("wrong"))).status, 401);
  assert.equal((await whoami(env, headers("right"))).status, 429);
  assert.equal((await whoami(env, headers("right", "2.2.2.2"))).status, 200);
});
