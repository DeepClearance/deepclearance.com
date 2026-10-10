import Link from "next/link";

export default function TermsPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="page-kicker">Legal</p>
          <h1>Terms</h1>
          <p className="page-lede">
            Paying for Deep Clearance or signing in to use it is agreeing to
            this page. Last updated 10 October 2026.
          </p>
        </header>
        <div className="content legal-content">
          <h2>What this covers</h2>
          <p>
            These terms are for Deep Clearance and this website. Deep Clearance
            is cited search over a collected public record. It is not a news
            wire, a classification authority, or legal, financial, or
            intelligence advice.
          </p>
          <p>
            The index holds short passages from public records, filings,
            interviews, public reporting, and excerpted shelf works (including
            public-domain texts and archive material named on the homepage).
            Deep Clearance does not verify
            those passages and does not endorse them. The tier and the
            standard on a result are the standing of that source. They are
            not a finding by the operator.
          </p>
          <h2>Account</h2>
          <p>
            Sign in with GitHub or Nostr. A paid Lightning invoice mints a key
            on that login. The key is a secret. You are responsible for where
            you paste it.
          </p>
          <h2>Payment</h2>
          <p>
            Checkout is Lightning on Bitcoin mainnet through OpenNode. Sats are
            not refundable once the invoice settles and the key is minted.
            Coupons and referrals do not stack. Referral credit is not
            withdrawable.
          </p>
          <h2>Use</h2>
          <p>
            Query caps reset at 00:00 UTC. Do not share a key as a public
            service. We may revoke a key that is published, farmed, or used to
            attack the service.
          </p>
          <p>
            <Link href="/privacy/">Privacy</Link>.{" "}
            <Link href="/support/">Support</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
