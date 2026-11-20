import Link from "next/link";
import IntelChrome from "../../components/IntelChrome";
import { dispatchDate, dispatches } from "../../lib/dispatches";

export default function DispatchesPage() {
  const latest = [...dispatches].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <IntelChrome title="Deep Clearance Dispatch" lede="New documents and what they change.">
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
