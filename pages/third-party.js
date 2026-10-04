import Link from "next/link";

export default function ThirdPartyPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="page-kicker">Legal</p>
          <h1>Third-party services</h1>
          <p className="page-lede">
            Who besides Deep Clearance can receive data. Last updated 4 October
            2026. <Link href="/privacy/">Privacy</Link>.
          </p>
        </header>
        <div className="content legal-content">
          <h2>GitHub</h2>
          <p>OAuth sign-in. GitHub sees the login you use to continue.</p>
          <h2>Nostr</h2>
          <p>Optional sign-in. The signed event is checked and not republished by us.</p>
          <h2>OpenNode</h2>
          <p>Lightning invoices. OpenNode sees the charge, not your queries.</p>
          <h2>Cloudflare</h2>
          <p>
            The Worker, the key database, session storage, and the search index
            run on Cloudflare.
          </p>
          <h2>TypeSafe</h2>
          <p>
            An optional judge may score a packed excerpt. If that key is unset,
            the judge is off and search still works.
          </p>
          <h2>Resend</h2>
          <p>The support form sends mail through Resend to the support address.</p>
        </div>
      </div>
    </section>
  );
}
