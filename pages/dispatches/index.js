import Link from "next/link";
import IntelChrome from "../../components/IntelChrome";
import { dispatchDate } from "../../lib/dispatches";

import { dispatchSnapshot } from "../../lib/dispatchSnapshot";

export async function getStaticProps() {
  return { props: { dispatches: await dispatchSnapshot() } };
}

export default function DispatchesPage({ dispatches }) {
  const latest = [...dispatches].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <IntelChrome title="Deep Clearance Dispatch" lede="New documents and what they change.">
      <p><a href="/dispatches/rss.xml">Subscribe via RSS</a></p>
      <div className="dc-read">
        {latest.map((dispatch) => (
          <article key={dispatch.slug}>
            <time dateTime={dispatch.date}>{dispatchDate(dispatch.date)}</time>
            <h2>
              <Link href={`/dispatches/${dispatch.slug}/`}>{dispatch.title}</Link>
            </h2>
            <p>{dispatch.summary}</p>
          </article>
        ))}
      </div>
    </IntelChrome>
  );
}
