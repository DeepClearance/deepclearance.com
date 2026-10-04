import Link from "next/link";
import SiteBrand from "./SiteBrand";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <SiteBrand className="footer-brand" />
        <nav className="footer-nav" aria-label="Footer">
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/docs/">Docs</Link>
              </li>
              <li>
                <Link href="/pricing/">Plans</Link>
              </li>
              <li>
                <Link href="/subscribe/">Checkout</Link>
              </li>
              <li>
                <Link href="/account/">Account</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li>
                <Link href="/terms/">Terms</Link>
              </li>
              <li>
                <Link href="/privacy/">Privacy</Link>
              </li>
              <li>
                <Link href="/security/">Security</Link>
              </li>
              <li>
                <Link href="/third-party/">Third parties</Link>
              </li>
              <li>
                <Link href="/support/">Support</Link>
              </li>
            </ul>
          </div>
        </nav>
        <p className="footer-note">
          Cited search. Lightning. Model Context Protocol (MCP).
        </p>
      </div>
    </footer>
  );
}
