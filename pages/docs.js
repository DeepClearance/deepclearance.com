import Link from "next/link";
import { MCP_URL } from "../lib/api";
import IntelChrome from "../components/IntelChrome";

const TOOLS = [
  ["search", "Cited passages. If the reply says the index had no passage, stop there."],
  ["get_passage", "The stored excerpt for a cite. Not a live crawl."],
  ["verify_claim", "Whether a stored excerpt supports a claim. The judge is not a source."],
  ["get_snapshot", "Replay a dated report. Free. A new date is a new tool call."],
];

export default function DocsPage() {
  return (
    <IntelChrome
      title="Docs"
      lede="Connect with a paid key. Unauthenticated tool calls fail."
    >
      <p>
        Endpoint <code>{MCP_URL}</code>. Cursor and other clients send{" "}
        <code>Authorization: Bearer</code>. Claude uses OAuth from Account.
        Login does not mint a free key.
      </p>
      <h2>Tools</h2>
      <ul>
        {TOOLS.map(([name, text]) => (
          <li key={name}>
            <code>{name}</code>. {text}
          </li>
        ))}
      </ul>
      <p>
        <code>source</code> pins one topic: <code>origin_literature</code>,{" "}
        <code>secrecy_labels</code>, <code>contractor_layer</code>,{" "}
        <code>postwar_record</code>, <code>financial_control</code>,{" "}
        <code>fiction_contamination</code>, or <code>disclosure_pressure</code>.
        Omit it to search documents and transcripts.
      </p>
      <p>
        Trial is 50 queries a day, Researcher 250, Developer 500.{" "}
        <code>get_snapshot</code> does not count. <Link href="/pricing/">Plans</Link>{" "}
        and <Link href="/account/">Account</Link> hold the key.
      </p>
    </IntelChrome>
  );
}
