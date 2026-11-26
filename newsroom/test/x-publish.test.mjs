import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker.mjs";
import { d1, sha256, strictFetch, tokenKey } from "./helpers.mjs";

async function setup(t, { live = true, fail = false } = {}) {
  const DB = d1("schema.sql", "x-schema.sql");
  const copy = "Federal Register notice: the agency proposes a new reporting rule for bank holding companies.";
  const image = { key: "a".repeat(64) + ".jpg", alt: "Document crop of the notice." };
  const insert = DB.sql.prepare("INSERT INTO editions (slug, revision, published, content) VALUES (?, 1, 1, ?)");
  for (const slug of ["first-dispatch", "second-dispatch"]) insert.run(slug, JSON.stringify({ slug, xCopy: copy, image }));
  const env = {
    EDITOR_TOKEN: "shared", EDITOR_TOKENS: JSON.stringify({ josh: await sha256("josh-key"), maya: await sha256("maya-key") }),
    X_APPROVERS: "josh", X_CLIENT_ID: "client", X_CLIENT_SECRET: "secret", X_REFRESH_TOKEN: "initial",
    X_ACCOUNT_ID: "123", X_TOKEN_KEY: tokenKey(), DB,
    MEDIA: { get: async () => ({ arrayBuffer: async () => new ArrayBuffer(4), httpMetadata: { contentType: "image/jpeg" } }) },
  };
  const state = { live, fail, sends: 0, refresh: [] };
  strictFetch(t, async (url, init) => {
    if (url.startsWith("https://deepclearance.com/")) return new Response(state.live ? '<meta name="dispatch-revision" content="1">' : "", { status: state.live ? 200 : 404 });
    if (url.endsWith("/oauth2/token")) {
      state.refresh.push(init.body.get("refresh_token"));
      return Response.json({ access_token: "user-token", refresh_token: `rotated-${state.refresh.length}` });
    }
    if (url.endsWith("/users/me")) return Response.json({ data: { id: "123" } });
    if (url.endsWith("/media/upload")) return Response.json({ data: { id: "456" } });
    if (url.endsWith("/media/metadata")) return new Response(null, { status: 204 });
    if (url === "https://api.x.com/2/tweets") {
      state.sends++;
      if (state.fail) throw new Error("simulated timeout");
      return Response.json({ data: { id: String(780 + state.sends) } }, { status: 201 });
    }
  });
  const call = (slug, body, key = "josh-key") => worker.fetch(new Request("https://newsroom.example/api/editor/x/" + slug, {
    method: body ? "POST" : "GET", headers: { authorization: `Bearer ${key}` }, body: body ? JSON.stringify(body) : undefined,
  }), env);
  return { env, DB, state, call, copy };
}

test("approval is recorded in the ledger before the post, and the refresh token never sits in D1 in plain text", async (t) => {
  const { DB, state, call } = await setup(t);
  const review = await (await call("first-dispatch")).json();
  assert.equal(review.canApprove, true);
  assert.match(review.text, /\n\nhttps:\/\/deepclearance\.com\/dispatches\/first-dispatch\/$/);

  assert.equal((await call("first-dispatch", { revision: 1, text: review.text + " edited", decision: "approve" })).status, 409);
  const posted = await call("first-dispatch", { revision: 1, text: review.text, decision: "approve", note: "ok" });
  assert.equal(posted.status, 200);
  assert.equal((await posted.json()).postUrl, "https://x.com/i/web/status/781");

  const rows = DB.sql.prepare("SELECT * FROM approvals").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].actor, "josh");
  assert.equal(rows[0].decision, "approved");
  assert.equal(rows[0].text, review.text);
  assert.equal(rows[0].outcome, "posted");
  assert.equal(rows[0].post_id, "781");

  const stored = DB.sql.prepare("SELECT * FROM x_token").get();
  assert.ok(stored.ciphertext && !JSON.stringify(stored).includes("rotated"));
  await call("second-dispatch", { revision: 1, text: (await (await call("second-dispatch")).json()).text, decision: "approve" });
  assert.deepEqual(state.refresh, ["initial", "rotated-1"]);

  const holds = await (await worker.fetch(new Request("https://newsroom.example/api/editor/ledger?format=holds",
    { headers: { authorization: "Bearer maya-key" } }), { ...(await setupEnv(DB)) })).text();
  assert.match(holds, /^- APPROVAL A-\d{8}-DC-X-FIRST-DISPATCH-R1-APPROVED \| \d{4}-\d{2}-\d{2} \d{2}:\d{2} Paramaribo \| josh in DC newsroom/m);
  assert.throws(() => DB.sql.exec("DELETE FROM approvals"), /append-only/);
});

async function setupEnv(DB) {
  return { DB, EDITOR_TOKENS: JSON.stringify({ maya: await sha256("maya-key") }) };
}

test("the shared key and unlisted editors cannot approve; rejections are recorded", async (t) => {
  const { DB, state, call } = await setup(t);
  const review = await (await call("first-dispatch", undefined, "shared")).json();
  assert.equal(review.canApprove, false);
  assert.equal((await call("first-dispatch", { revision: 1, text: review.text, decision: "approve" }, "shared")).status, 403);
  assert.equal((await call("first-dispatch", { revision: 1, text: review.text, decision: "approve" }, "maya-key")).status, 403);
  const rejected = await call("first-dispatch", { revision: 1, text: review.text, decision: "reject", note: "weak source" });
  assert.equal((await rejected.json()).decision, "rejected");
  assert.equal(state.sends, 0);
  assert.equal(DB.sql.prepare("SELECT decision FROM approvals").get().decision, "rejected");
});

test("ambiguous timeouts block retries until reconciled, and unlive editions are refused", async (t) => {
  const { state, call } = await setup(t, { live: false, fail: true });
  const text = (await (await call("second-dispatch")).json()).text;
  assert.equal((await call("second-dispatch", { revision: 1, text, decision: "approve" })).status, 409);
  state.live = true;
  assert.equal((await call("second-dispatch", { revision: 1, text, decision: "approve" })).status, 502);
  assert.equal((await (await call("second-dispatch")).json()).status, "uncertain");
  assert.equal((await call("second-dispatch", { revision: 1, text, decision: "approve" })).status, 409);
  assert.equal(state.sends, 1);
});

test("over-length posts are refused with the weighted count", async (t) => {
  const { DB, call } = await setup(t);
  DB.sql.prepare("INSERT INTO editions (slug, revision, published, content) VALUES ('long', 1, 1, ?)")
    .run(JSON.stringify({ slug: "long", xCopy: "x".repeat(260) }));
  const review = await (await call("long")).json();
  assert.equal(review.length, 262 + 23);
  const response = await call("long", { revision: 1, text: review.text, decision: "approve" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /285 of 280/);
});
