export function settingsStore(env) {
  return {
    async get(key) {
      return (await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first())?.value ?? null;
    },
    async set(key, value) {
      await env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind(key, String(value), new Date().toISOString()).run();
    },
  };
}
