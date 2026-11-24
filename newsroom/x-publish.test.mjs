import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "./worker.mjs";

test("sends approved X payload once and blocks ambiguous retries", async (t) => {
  const sql = new DatabaseSync(":memory:");
  for (const name of ["schema.sql", "x-schema.sql"]) sql.exec(readFileSync(new URL(name, import.meta.url), "utf8"));
  const copy = "A new age of truth.\n\nDeep Clearance Dispatch is independent AI journalism. We trace claims to the record and show you the evidence, so you can make up your own mind.\n\nFrom propaganda to proof.";
  const image = { key: "a".repeat(64) + ".jpg", alt: "A new age of truth. From propaganda to proof." };
  const insert = sql.prepare("INSERT INTO editions (slug, revision, published, content) VALUES (?, 1, 1, ?)");
  for (const slug of ["a-new-age-of-truth", "second-dispatch"]) insert.run(slug, JSON.stringify({ slug, xCopy: copy, image }));
  const env = {
    EDITOR_TOKEN: "editor", X_CLIENT_ID: "client", X_CLIENT_SECRET: "secret", X_REFRESH_TOKEN: "initial", X_ACCOUNT_ID: "123",
    DB: { prepare(query) {
      const stmt = sql.prepare(query);
      const bind = (...params) => ({ first: () => stmt.get(...params), run: () => ({ meta: stmt.run(...params) }) });
      return { ...bind(), bind };
    }},
    MEDIA: { get: () => ({ arrayBuffer: async () => new ArrayBuffer(4), httpMetadata: { contentType: "image/jpeg" } }) },
  };
  let live = false;
  let fail = false;
  let sends = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url.startsWith("https://deepclearance.com/")) return new Response(live ? '<meta name="dispatch-revision" content="1">' : "", { status: live ? 200 : 404 });
    if (url.endsWith("/oauth2/token")) {
      assert.equal(init.body.get("refresh_token"), sends ? "rotated" : "initial");
      return Response.json({ access_token: "user-token", refresh_token: "rotated" });
    }
    assert.equal(init.headers.authorization, "Bearer user-token");
    if (url.endsWith("/users/me")) return Response.json({ data: { id: "123" } });
    if (url.endsWith("/media/upload")) {
      assert.equal(init.body.get("media_category"), "tweet_image");
      return Response.json({ data: { id: "456" } });
    }
    if (url.endsWith("/media/metadata")) {
      assert.equal(JSON.parse(init.body).metadata.alt_text.text, image.alt);
      return new Response(null, { status: 204 });
    }
    assert.equal(url, "https://api.x.com/2/tweets");
    sends++;
    const slug = fail ? "second-dispatch" : "a-new-age-of-truth";
    assert.deepEqual(JSON.parse(init.body), { text: copy + "\n\nhttps://deepclearance.com/dispatches/" + slug + "/", media: { media_ids: ["456"] } });
    if (fail) throw new Error("simulated timeout");
    return Response.json({ data: { id: "789" } }, { status: 201 });
  });
  const call = (slug, revision) => worker.fetch(new Request("https://newsroom.example/api/editor/x/" + slug, {
    method: revision === undefined ? "GET" : "POST",
    headers: { authorization: "Bearer editor" },
    body: revision === undefined ? undefined : JSON.stringify({ revision }),
  }), env);
  const slug = "a-new-age-of-truth";
  assert.match((await (await call(slug)).json()).text, /^A new age of truth/);
  assert.equal((await call(slug, 1)).status, 409);
  live = true;
  assert.equal((await call(slug, 0)).status, 409);
  const results = await Promise.all([call(slug, 1), call(slug, 1)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await (await call(slug)).json()).postUrl, "https://x.com/i/web/status/789");
  fail = true;
  assert.equal((await call("second-dispatch", 1)).status, 502);
  assert.equal((await (await call("second-dispatch")).json()).status, "uncertain");
  assert.equal((await call("second-dispatch", 1)).status, 409);
  assert.equal(sends, 2);
});
