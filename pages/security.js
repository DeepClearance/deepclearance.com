import Link from "next/link";

export default function SecurityPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="page-kicker">Legal</p>
          <h1>Security</h1>
          <p className="page-lede">
            How the key and the index are bounded. Last updated 4 October 2026.
          </p>
        </header>
        <div className="content legal-content">
          <h2>The key</h2>
          <p>
            Tool calls require a paid Bearer key or a Claude OAuth session tied
            to one. Unauthenticated calls fail. A published key can be revoked.
          </p>
          <h2>The index</h2>
          <p>
            Search returns stored passages. It does not fetch the live web, and
            it does not hold classified material. A missing passage comes back
            empty. The optional judge scores a packed excerpt. It does not add
            a source.
          </p>
          <h2>Reports</h2>
          <p>
            Send security reports to{" "}
            <a href="mailto:support@deepclearance.com">support@deepclearance.com</a>{" "}
            or the <Link href="/support/">contact form</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
