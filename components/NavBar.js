import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  consumeSessionFromHash,
  fetchMe,
} from "../lib/auth";
import SiteBrand from "./SiteBrand";

const NAV_LINKS = [
  { href: "/", title: "Overview" },
  { href: "/docs/", title: "Docs" },
  { href: "/pricing/", title: "Plans" },
];

function isActivePath(pathname, href) {
  const path = (pathname || "/").replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";
  return path === target;
}

function accountLabel(user) {
  if (!user) return "Sign in";
  if (user.github) return `@${user.github}`;
  if (user.nostr_name) return user.nostr_name;
  if (user.nostr) return `npub ${user.nostr.slice(0, 8)}`;
  return "Account";
}

export default function NavBar() {
  const router = useRouter();
  const rootRef = useRef(null);
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const close = () => {
      setDrawer(false);
    };
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

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
  }, [router.asPath]);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    if (drawer) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <nav
      ref={rootRef}
      className={`nav${drawer ? " is-open" : ""}`}
      aria-label="Primary"
    >
      <div className="nav-bar">
        <div className="nav-logo">
          <SiteBrand lockup onClick={() => setDrawer(false)} />
        </div>

        <button
          type="button"
          className={`nav-toggle${drawer ? " is-open" : ""}`}
          aria-expanded={drawer}
          aria-controls="site-nav-links"
          onClick={() => setDrawer((value) => !value)}
        >
          <span className="nav-toggle__bars" aria-hidden="true" />
          <span className="visually-hidden">
            {drawer ? "Close menu" : "Open menu"}
          </span>
        </button>

        <div
          id="site-nav-links"
          className={`nav-links${drawer ? " is-open" : ""}`}
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                isActivePath(router.pathname, item.href) ? "page" : undefined
              }
              onClick={() => setDrawer(false)}
            >
              {item.title}
            </Link>
          ))}
          <Link
            href="/account/"
            className="nav-signin"
            aria-current={
              isActivePath(router.pathname, "/account") ? "page" : undefined
            }
            onClick={() => setDrawer(false)}
          >
            {accountLabel(user)}
          </Link>
        </div>
      </div>
      <button
        type="button"
        className={`nav-backdrop${drawer ? " is-open" : ""}`}
        tabIndex={drawer ? 0 : -1}
        aria-hidden={!drawer}
        aria-label="Close menu"
        onClick={() => setDrawer(false)}
      />
    </nav>
  );
}
