import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// A D1-shaped wrapper over node:sqlite, loaded with the real migration files.
export function d1(...files) {
  const sql = new DatabaseSync(":memory:");
  for (const name of files) sql.exec(readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
  const DB = {
    sql,
    prepare(query) {
      const stmt = sql.prepare(query);
      const bind = (...params) => {
        const args = params.map((value) => value === undefined ? null : value);
        return {
          first: async () => stmt.get(...args) ?? null,
          all: async () => ({ results: stmt.all(...args) }),
          run: async () => { const r = stmt.run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
        };
      };
      return { ...bind(), bind };
    },
  };
  return DB;
}

export const sha256 = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))),
  (b) => b.toString(16).padStart(2, "0")).join("");

export const tokenKey = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");

// Any network call a test did not expect fails the test; nothing reaches X or an LLM.
export function strictFetch(t, handler) {
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const response = await handler(url, init);
    if (!response) throw new Error(`Unexpected network call in test: ${url}`);
    return response;
  });
}
