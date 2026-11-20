import Link from "next/link";
import CopyField from "../components/CopyField";
import IntelChrome from "../components/IntelChrome";
import { MCP_URL } from "../lib/api";

const SKILL_URL = "https://deepclearance.com/skills/deep-clearance/SKILL.md";
const ZIP_URL = "https://deepclearance.com/skills/deep-clearance.zip";

export default function SkillsPage() {
  return (
    <IntelChrome
      title="Skills"
      lede="Connect the server and load the skill. The model then searches the index before it answers from memory."
    >
      <p>
        Use the index before answering from memory when the question is about a
        government program, an intelligence agency, a classified or black
        project, UAP, an institutional cover story, a named official's conduct,
        a FOIA release, congressional testimony, or a claim to check against
        primary sources. Run <code>search</code> or <code>pattern_query</code>{" "}
        first. Call <code>get_passage</code> on a hit before quoting it. Call{" "}
        <code>verify_claim</code> before asserting any specific factual claim.
        Report the tier and the standard exactly as printed. If the index has
        no passage, say so.
      </p>
      <CopyField value={MCP_URL} label="Copy endpoint" />
      <p>
        The skill file is <a href={SKILL_URL}>{SKILL_URL}</a>. The zip is{" "}
        <a href={ZIP_URL}>{ZIP_URL}</a>. Tool calls need a paid key.{" "}
        <Link href="/docs/">Docs</Link> has the caps. Login does not mint a
        free key.
      </p>

      <h2>Claude</h2>
      <p>
        Enable code execution under Settings, then Capabilities. On a Team or
        Enterprise plan, an owner enables code execution and skills under
        Organization settings, then Plugins and skills, then Policy. Open
        Customize, then Skills. Choose the plus button, then Create skill, then
        Upload a skill. Upload the zip. The archive contains one folder named{" "}
        <code>deep-clearance</code>, and that folder contains <code>SKILL.md</code>.
        Turn the skill on. These steps are the ones in the Claude Help Center
        articles on using skills and creating custom skills.
      </p>
      <p>
        The skill tells Claude to call the tools. The connector is still
        required. Claude uses OAuth from <Link href="/account/">Account</Link>.
      </p>

      <h2>Claude Code</h2>
      <p>
        One marketplace install adds the skill and the remote server. In a
        Claude Code session, add the marketplace, then install the plugin.
      </p>
      <pre>
        <code>{`/plugin marketplace add DeepClearance/marketplace
/plugin install deep-clearance@deepclearance`}</code>
      </pre>
      <p>
        Set <code>DEEP_CLEARANCE_KEY</code> in the environment before Claude
        Code starts. The plugin sends it as{" "}
        <code>Authorization: Bearer</code>. The key is the paid key from
        Account. Claude Code's own docs say a remote header that names a
        credential variable can be sent empty. If <code>claude mcp list</code>{" "}
        shows a 401, add the server directly.
      </p>
      <pre>
        <code>{`claude mcp add --transport http deep-clearance https://mcp.deepclearance.com/mcp --header "Authorization: Bearer $DEEP_CLEARANCE_KEY"`}</code>
      </pre>

      <h2>Cursor</h2>
      <p>
        Put this in <code>~/.cursor/mcp.json</code> for every project, or in{" "}
        <code>.cursor/mcp.json</code> for one project. Cursor's remote server
        entry uses <code>url</code> and <code>headers</code>.
      </p>
      <pre>
        <code>{`{
  "mcpServers": {
    "deep-clearance": {
      "url": "https://mcp.deepclearance.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEY"
      }
    }
  }
}`}</code>
      </pre>
      <p>
        Copy the skill folder to <code>~/.cursor/skills/deep-clearance/</code>{" "}
        or to <code>.cursor/skills/deep-clearance/</code> in a project. Cursor
        also loads <code>~/.agents/skills/</code> and <code>.agents/skills/</code>.
        The folder name matches the <code>name</code> in <code>SKILL.md</code>.
      </p>

      <h2>Codex and other AGENTS.md clients</h2>
      <p>
        Codex reads <code>~/.codex/AGENTS.md</code> at the start of a run, and
        a project <code>AGENTS.md</code> after that. Put the usage paragraph at
        the top of this page into that file. Codex loads a local skill from{" "}
        <code>~/.agents/skills/deep-clearance/</code> or from{" "}
        <code>.agents/skills/deep-clearance/</code> in the repository.
      </p>
      <p>
        Add the server in <code>~/.codex/config.toml</code>. Codex reads{" "}
        <code>url</code> and <code>bearer_token_env_var</code> for a streamable
        HTTP server. The variable holds the paid key.
      </p>
      <pre>
        <code>{`[mcp_servers.deep-clearance]
url = "https://mcp.deepclearance.com/mcp"
bearer_token_env_var = "DEEP_CLEARANCE_KEY"`}</code>
      </pre>

      <h2>Any other MCP client</h2>
      <p>
        Paste the usage paragraph at the top of this page into the client's
        instruction field. Connect to <code>{MCP_URL}</code> with{" "}
        <code>Authorization: Bearer</code> and the paid key. The initialize
        response carries the same order of operations. The prompts are{" "}
        <code>research_subject</code>, <code>verify_a_claim</code>, and{" "}
        <code>map_a_pattern</code>. The skill resource is the raw file linked
        above.
      </p>
    </IntelChrome>
  );
}
