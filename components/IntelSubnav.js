import Link from "next/link";
import { useRouter } from "next/router";

const ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/docs/", label: "Docs" },
  { href: "/pricing/", label: "Plans" },
  { href: "/subscribe/", label: "Checkout" },
  { href: "/account/", label: "Account" },
];

function active(pathname, href) {
  const path = (pathname || "/").replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";
  return path === target;
}

export default function IntelSubnav() {
  const router = useRouter();
  return (
    <nav className="intel-subnav" aria-label="Intelligence">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            active(router.pathname, item.href) ? "is-on" : undefined
          }
          aria-current={
            active(router.pathname, item.href) ? "page" : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
