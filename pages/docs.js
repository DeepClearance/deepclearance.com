import Link from "next/link";
import { MCP_URL } from "../lib/api";
import IntelChrome from "../components/IntelChrome";

const TOOLS = [
  ["search", "Cited passages. If the reply says the index had no passage, stop there."],
  ["get_passage", "The stored excerpt for a cite. Not a live crawl."],
  ["verify_claim", "Whether a stored excerpt supports a claim. The judge is not a source."],
  ["get_snapshot", "Replay a dated report. Free. A new date is a new tool call."],
  ["corruption_lookup", "Corruption events by actor, jurisdiction, mechanism, and date. Each event keeps its own standard."],
  ["pattern_query", "A network or mechanism, with the events and cited passages. Each claim keeps its own standard."],
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
        <code>fiction_contamination</code>, <code>disclosure_pressure</code>,{" "}
        <code>system</code>,{" "}
        <code>epstein_record</code>, <code>declassified_record</code>,{" "}
        <code>shelf</code>, <code>industry_record</code>, or <code>wire</code>.
        Omit it to search the whole index. <code>system</code> pins the analysis
        of capture, suppression, and the reading of this record.{" "}
        <code>epstein_record</code> pins the court records and FOIA releases.{" "}
        <code>declassified_record</code> pins the government files and public
        patents. <code>shelf</code> pins longer published works, and a reply
        from that pin is a short passage. <code>industry_record</code> pins
        chemical, pharmaceutical, and fossil-fuel industry documents.{" "}
        <code>wire</code> pins agency releases and public reporting.
      </p>
      <p>
        Trial is 50 queries a day, Researcher 250, Control 500.{" "}
        <code>get_snapshot</code> does not count. <Link href="/pricing/">Plans</Link>{" "}
        and <Link href="/account/">Account</Link> hold the key.
      </p>
    </IntelChrome>
  );
}
