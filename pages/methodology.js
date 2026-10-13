import Link from "next/link";
import IntelChrome from "../components/IntelChrome";
import { METHODOLOGY_PAGE } from "../lib/methodologyContent";

export default function MethodologyPage() {
  return (
    <IntelChrome title="Methodology" lede={METHODOLOGY_PAGE.lede}>
      {METHODOLOGY_PAGE.sections.map((section) => (
        <section key={section.heading || "intro"}>
          {section.heading ? <h2>{section.heading}</h2> : null}
          {section.paragraphs.map((text) => (
            <p key={text.slice(0, 48)}>{text}</p>
          ))}
        </section>
      ))}
      <p>
        <Link href="/docs/">Docs</Link> covers connection and tools.
      </p>
    </IntelChrome>
  );
}
