import Link from "next/link";

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="page-kicker">Legal</p>
          <h1>Privacy</h1>
          <p className="page-lede">
            How Deep Clearance handles account data. Last updated 4 October 2026.
          </p>
        </header>
        <div className="content legal-content">
          <h2>Who this is</h2>
          <p>
            Deep Clearance runs at{" "}
            <a href="https://deepclearance.com">deepclearance.com</a>. The
            connector is{" "}
            <a href="https://mcp.deepclearance.com">mcp.deepclearance.com</a>.{" "}
            <Link href="/terms/">Terms</Link> cover payment and use.
          </p>
          <h2>What we store</h2>
          <p>
            A login identifier from GitHub or Nostr, a hashed API key, plan and
            expiry, daily query counts, Lightning invoice records, coupon and
            referral rows, and optional dated snapshots of tool results tied to
            that key. We do not store a copy of your chat.
          </p>
          <h2>What we do not sell</h2>
          <p>Account data is not sold. It is used to run the key and the bill.</p>
          <p>
            Questions go to <Link href="/support/">support</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
