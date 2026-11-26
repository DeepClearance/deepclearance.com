// Pluggable drafting model. LLM_PROVIDER: "openai" | "xai" | "anthropic" | "openai-compatible" (with LLM_BASE_URL).
// LLM_API_KEY is a Worker secret. Without a provider and key, draft() returns null and nothing is drafted.
const endpoints = {
  openai: "https://api.openai.com/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
};

export function llmConfigured(env) {
  return Boolean(env.LLM_API_KEY && env.LLM_MODEL
    && (endpoints[env.LLM_PROVIDER] || env.LLM_PROVIDER === "anthropic" || (env.LLM_PROVIDER === "openai-compatible" && env.LLM_BASE_URL)));
}

export async function complete(env, system, user) {
  if (!llmConfigured(env)) return null;
  if (env.LLM_PROVIDER === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(60000),
      headers: { "x-api-key": env.LLM_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.LLM_MODEL, max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`Drafting model returned ${response.status}`);
    return (await response.json()).content?.map((part) => part.text || "").join("") || "";
  }
  const url = env.LLM_PROVIDER === "openai-compatible" ? env.LLM_BASE_URL : endpoints[env.LLM_PROVIDER];
  const response = await fetch(url, {
    method: "POST", signal: AbortSignal.timeout(60000),
    headers: { authorization: `Bearer ${env.LLM_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.LLM_MODEL, temperature: 0.2, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!response.ok) throw new Error(`Drafting model returned ${response.status}`);
  return (await response.json()).choices?.[0]?.message?.content || "";
}

export function parseJsonReply(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The drafting model returned no JSON.");
  return JSON.parse(text.slice(start, end + 1));
}
