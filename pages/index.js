import { useEffect, useState } from "react";
import Link from "next/link";
import { CORPUS, INDEX_CURATED, INDEX_OUT, INDEX_RECORD } from "../lib/api";
import IntelChrome from "../components/IntelChrome";
import { consumeSessionFromHash, fetchMe } from "../lib/auth";
import {
  HOMEPAGE_CLOSE,
  HOMEPAGE_FAQ,
  HOMEPAGE_LEDE,
  HOMEPAGE_READING,
} from "../lib/methodologyContent";

function PrimaryAction({ hasKey, signedIn }) {
  if (hasKey) {
    return (
      <Link href="/account/" className="btn btn-primary">
        Open Account
      </Link>
    );
  }
  if (signedIn) {
    return (
      <Link href="/subscribe/" className="btn btn-primary">
        Checkout
      </Link>
    );
  }
  return (
    <Link href="/subscribe/?plan=trial" className="btn btn-primary">
      Start the seven-day trial
    </Link>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await consumeSessionFromHash();
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const signedIn = Boolean(user);
  const hasKey = Boolean(user?.has_key);

  return (
    <IntelChrome heading={false} kicker="" subnav={false} home>
      <article className="dc-hero">
        <div className="dc-hero__copy">
          <h1>The suppression is the signal.</h1>
          {HOMEPAGE_LEDE.map((text) => (
            <p className="dc-hero__lede" key={text.slice(0, 32)}>
              {text}
            </p>
          ))}
          <div className="hero-ctas">
            <PrimaryAction hasKey={hasKey} signedIn={signedIn} />
            <Link href="/pricing/" className="btn btn-secondary">
              See plans
            </Link>
            <Link href="/docs/" className="btn btn-outline">
              Docs
            </Link>
          </div>
        </div>
        <ul className="dc-facts" aria-label="Corpus at a glance">
          <li>
            <span className="dc-facts__k">Documents</span>
            <span>{CORPUS.curated}</span>
          </li>
          <li>
            <span className="dc-facts__k">Interviews</span>
            <span>{CORPUS.record}</span>
          </li>
          <li>
            <span className="dc-facts__k">Passages</span>
            <span>{CORPUS.total}</span>
          </li>
          <li>
            <span className="dc-facts__k">Pay</span>
            <span>Lightning</span>
          </li>
          <li>
            <span className="dc-facts__k">Connect</span>
            <span>MCP</span>
          </li>
        </ul>
      </article>

      <section className="dc-read" aria-label="How Deep Clearance reads">
        {HOMEPAGE_READING.map((block) => (
          <div key={block.heading}>
            <h2>{block.heading}</h2>
            <p>{block.body}</p>
          </div>
        ))}
        {HOMEPAGE_CLOSE.map((text) => (
          <p className="dc-read__close" key={text.slice(0, 32)}>
            {text}
          </p>
        ))}
        <div className="dc-next">
          <PrimaryAction hasKey={hasKey} signedIn={signedIn} />
          <Link href="/methodology/">Methodology</Link>
        </div>
      </section>

      <section className="dc-file" aria-labelledby="intel-index-heading">
        <h2 id="intel-index-heading">What is in the index</h2>
        <p className="dc-file__lede">
          Every plan searches the same documents and the same interviews. A plan
          buys days and a daily cap on queries. The cards are a sample of a
          larger index. <Link href="/pricing/">See the plans</Link>.
        </p>
        <div className="dc-file__grid">
          <article>
            <h3>Curated</h3>
            <p className="dc-file__note">
              What companies, courts, and agencies wrote down, plus books.
            </p>
            <ul>
              {INDEX_CURATED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Record</h3>
            <p className="dc-file__note">
              Interviews and talks, with the source named.
            </p>
            <ul>
              {INDEX_RECORD.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Passage</h3>
            <p className="dc-file__note">
              A reply is a stored excerpt with the source attached.
            </p>
          </article>
          <article>
            <h3>Not in the index</h3>
            <ul>
              {INDEX_OUT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="dc-start" aria-labelledby="dc-start-heading">
        <h2 id="dc-start-heading">How to start</h2>
        <ol className="intel-flow">
        <li>
          <span className="intel-flow__n">1</span>
          <div>
            <strong>Sign in</strong>
            <p>GitHub or Nostr.</p>
          </div>
        </li>
        <li>
          <span className="intel-flow__n">2</span>
          <div>
            <strong>Pay Lightning</strong>
            <p>An upgrade keeps the same key.</p>
          </div>
        </li>
        <li>
          <span className="intel-flow__n">3</span>
          <div>
            <strong>Connect</strong>
            <p>Model Context Protocol (MCP). Claude uses OAuth. Others use a Bearer key.</p>
          </div>
        </li>
        <li>
          <span className="intel-flow__n">4</span>
          <div>
            <strong>Ask</strong>
            <p>The passage comes back with the source attached.</p>
          </div>
        </li>
        </ol>
      </section>

      <section className="dc-faq" aria-labelledby="dc-faq-heading">
        <h2 id="dc-faq-heading">Before you pay</h2>
        {HOMEPAGE_FAQ.map((item) => (
          <div key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </section>
    </IntelChrome>
  );
}
