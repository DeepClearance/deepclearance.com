/** Streamable HTTP MCP snippets. Auth is Authorization: Bearer, not OAuth. */

export function mcpSnippets({ url, key }) {
  const token = key || "YOUR_API_KEY";
  const auth = `Bearer ${token}`;
  const cursor = {
    mcpServers: {
      deepclearance: {
        url,
        headers: { Authorization: auth },
      },
    },
  };
  const claudeCode = {
    mcpServers: {
      deepclearance: {
        type: "http",
        url,
        headers: { Authorization: auth },
      },
    },
  };
  const vscode = {
    servers: {
      deepclearance: {
        type: "http",
        url,
        headers: { Authorization: auth },
      },
    },
  };
  return [
    {
      id: "cursor",
      title: "Cursor",
      where: "~/.cursor/mcp.json",
      note: "headers.Authorization must start with Bearer. Do not use Cursor OAuth for this server.",
      body: JSON.stringify(cursor, null, 2),
    },
    {
      id: "hermes",
      title: "Hermes Agent",
      where: "~/.hermes/config.yaml (mcp_servers)",
      note: "Authorization belongs under headers. Do not set auth: oauth. The OpenAI key is a different secret.",
      body: [
        "mcp_servers:",
        "  deepclearance:",
        `    url: "${url}"`,
        "    headers:",
        `      Authorization: "${auth}"`,
      ].join("\n"),
    },
    {
      id: "claude-code",
      title: "Claude Code",
      where: "terminal, then ~/.claude.json",
      note: "JSON entries need type: http. Claude.ai still uses the OAuth fields above, not this key.",
      body: [
        `claude mcp add --transport http deepclearance ${url} --header "Authorization: ${auth}"`,
        "",
        JSON.stringify(claudeCode, null, 2),
      ].join("\n"),
    },
    {
      id: "vscode",
      title: "VS Code / Copilot",
      where: ".vscode/mcp.json",
      note: "This file uses servers, not mcpServers.",
      body: JSON.stringify(vscode, null, 2),
    },
    {
      id: "codex",
      title: "Codex / ChatGPT desktop",
      where: "~/.codex/config.toml",
      note: "Set http_headers. Skip codex mcp login. OAuth on this server only returns to Claude.",
      body: [
        "[mcp_servers.deepclearance]",
        `url = "${url}"`,
        `http_headers = { Authorization = "${auth}" }`,
      ].join("\n"),
    },
    {
      id: "curl",
      title: "curl",
      where: "any shell",
      note: "payment_required means this header never arrived. unauthorized means the token was sent and rejected.",
      body: [
        `curl -sS -X POST '${url}' \\`,
        "  -H 'content-type: application/json' \\",
        `  -H 'Authorization: ${auth}' \\`,
        `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
      ].join("\n"),
    },
  ];
}
