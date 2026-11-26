import Link from "next/link";
import IntelChrome from "../../components/IntelChrome";
import { dispatchDate } from "../../lib/dispatches";
import { SITE_ORIGIN } from "../../lib/pageMeta";

import { dispatchSnapshot } from "../../lib/dispatchSnapshot";

export async function getStaticPaths() {
  return {
    paths: (await dispatchSnapshot()).map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const dispatch = (await dispatchSnapshot()).find(({ slug }) => slug === params.slug);
  return dispatch ? { props: { dispatch } } : { notFound: true };
}

export default function DispatchPage({ dispatch }) {
  const url = `${SITE_ORIGIN}/dispatches/${dispatch.slug}/`;
  const share = new URLSearchParams({ text: dispatch.title, url });

  return (
    <IntelChrome title={dispatch.title} lede={dispatch.summary}>
      <article className="dc-read">
        <time dateTime={dispatch.date}>{dispatchDate(dispatch.date)}</time>
        {dispatch.image && (
          <img
            src={dispatch.image.src}
            alt={dispatch.image.alt}
            style={{ display: "block", maxWidth: "100%", height: "auto", margin: "1rem 0" }}
          />
        )}
        {dispatch.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <h2>Sources</h2>
        <ul>
          {dispatch.sources.map(({ title, url }) => (
            <li key={url}><a href={url}>{title}</a></li>
          ))}
        </ul>
        {dispatch.updates.length > 0 && (
          <section>
            <h2>Updates and corrections</h2>
            {dispatch.updates.map(({ date, text }) => (
              <p key={`${date}-${text}`}>
                <time dateTime={date}>{dispatchDate(date)}</time> · {text}
              </p>
            ))}
          </section>
        )}
        <div className="hero-ctas">
          <a className="btn btn-primary" href={`https://x.com/intent/post?${share}`}>Share on X</a>
          <Link className="btn btn-outline" href="/dispatches/">All dispatches</Link>
        </div>
      </article>
    </IntelChrome>
  );
}
