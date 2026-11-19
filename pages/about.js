import Link from "next/link";
import IntelChrome from "../components/IntelChrome";
import { ABOUT_PAGE } from "../lib/aboutContent";

export default function AboutPage() {
  return (
    <IntelChrome title="About" lede={ABOUT_PAGE.lede}>
      <div className="dc-read">
        {ABOUT_PAGE.sections.map((section) => (
          <div key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((text) => (
              <p key={text.slice(0, 48)}>{text}</p>
            ))}
          </div>
        ))}
        <p className="dc-read__close">{ABOUT_PAGE.close}</p>
      </div>
      <div className="hero-ctas">
        <Link href="/methodology/" className="btn btn-primary">
          How evidence is weighed
        </Link>
        <Link href="/pricing/" className="btn btn-outline">
          See plans
        </Link>
      </div>
    </IntelChrome>
  );
}
