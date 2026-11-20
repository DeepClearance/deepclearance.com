import Link from "next/link";
import { MCP_URL } from "../lib/api";
import CopyField from "../components/CopyField";
import IntelChrome from "../components/IntelChrome";
import { DOCS_METHODOLOGY } from "../lib/methodologyContent";

const TOOLS = [
  ["search", "Use first for a program, agency, classified project, UAP case, cover story, named official, FOIA release, hearing, filing, or claim. Returns cited passages. Costs 1 query."],
  ["get_passage", "Use before quoting a hit. Returns the stored excerpt. Costs 1 query."],
  ["verify_claim", "Use after search and get_passage, before asserting a specific factual claim. Scores one stored passage. The score is not a source. Costs 1 query."],
  ["get_snapshot", "Replay a dated report when you already have a snapshot id. Costs nothing."],
  ["corruption_lookup", "Use for an actor, jurisdiction, mechanism, or date range. Each event keeps its own standard. Costs 1 query."],
  ["pattern_query", "Use first for a network or a pattern across institutions. Costs 1 query."],
];

export default function DocsPage() {
  return (
    <IntelChrome
      title="Docs"
        lede="Add this endpoint to the model you already use. The model searches before it answers. Tool calls need a paid key."
    >
      <CopyField value={MCP_URL} label="Copy endpoint" />
      <p>
        Cursor and other clients send <code>Authorization: Bearer</code>. Claude
        uses OAuth from Account. Login does not mint a free key. Install steps
        for the skill are on <Link href="/skills/">Skills</Link>.
      </p>
      <h2>{DOCS_METHODOLOGY.title}</h2>
      {DOCS_METHODOLOGY.paragraphs.map((text) => (
        <p key={text.slice(0, 48)}>{text}</p>
      ))}
      <p>
        <Link href="/methodology/">Methodology</Link>
      </p>
      <h2>Tools</h2>
      <ul className="dc-tools">
        {TOOLS.map(([name, text]) => (
          <li key={name}>
            <code>{name}</code>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p>
        <code>source</code> pins one topic: <code>origin_literature</code>,{" "}
        <code>secrecy_labels</code>, <code>contractor_layer</code>,{" "}
        <code>postwar_record</code>, <code>financial_control</code>,{" "}
        <code>fiction_contamination</code>, <code>disclosure_pressure</code>,{" "}
        <code>epstein_record</code>, <code>declassified_record</code>,{" "}
        <code>shelf</code>, <code>industry_record</code>, or <code>wire</code>.
        Omit it to search the documentary index. Do not pass <code>system</code>.
        That pin is not returned as a cite.{" "}
        <code>epstein_record</code> pins the court records and FOIA releases.{" "}
        <code>declassified_record</code> pins the government files and public
        patents. <code>shelf</code> pins longer published works, and a reply
        from that pin is a short passage. <code>industry_record</code> pins
        chemical, pharmaceutical, and fossil-fuel industry documents.{" "}
        <code>wire</code> pins agency releases and public reporting.
      </p>
      <p>
        Trial includes 50 queries a day, Researcher 250, Control 500. A top up
        pays for queries after that set is used. <code>get_snapshot</code> does
        not count. <Link href="/pricing/">Plans</Link>{" "}
        and <Link href="/account/">Account</Link> hold the key.
      </p>
    </IntelChrome>
  );
}
