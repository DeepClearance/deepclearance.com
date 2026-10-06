import { useEffect, useState } from "react";
import Link from "next/link";
import { CORPUS, INDEX_CURATED, INDEX_OUT, INDEX_RECORD } from "../lib/api";
import IntelChrome from "../components/IntelChrome";
import { consumeSessionFromHash, fetchMe } from "../lib/auth";

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
          <p className="dc-hero__lede">
            Court records, released files, and patents, with the
            interviews on the postwar UAP record, the contractor layer, and the
            black budget. Pay with Lightning. Connect over Model Context
            Protocol (MCP).
          </p>
          <div className="hero-ctas">
            {hasKey ? (
              <Link href="/account/" className="btn btn-primary">
                Open Account
              </Link>
            ) : signedIn ? (
              <Link href="/subscribe/" className="btn btn-primary">
                Checkout
              </Link>
            ) : (
              <Link href="/subscribe/?plan=trial" className="btn btn-primary">
                Start trial
              </Link>
            )}
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
            <span className="dc-facts__k">Curated</span>
            <span>{CORPUS.curated}</span>
          </li>
          <li>
            <span className="dc-facts__k">Record</span>
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

      <section className="dc-file" aria-labelledby="intel-index-heading">
        <h2 id="intel-index-heading">What is in the index</h2>
        <p className="dc-file__lede">
          Every plan searches both layers. <Link href="/pricing/">Plans</Link>{" "}
          differ by days and query cap.
        </p>
        <div className="dc-file__grid">
          <article>
            <h3>Curated</h3>
            <p className="dc-file__note">
              The written layer. Filings, released files, patents, hearings, and public reporting.
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
              The spoken layer. Short passages, with the source attached.
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
            <p>The answer, with the source attached.</p>
          </div>
        </li>
      </ol>
    </IntelChrome>
  );
}
