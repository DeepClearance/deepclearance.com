import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  consumeSessionFromHash,
  fetchMe,
} from "../lib/auth";
import SiteBrand from "./SiteBrand";

const NAV_GROUPS = [
  {
    id: "index",
    title: "Index",
    items: [
      { href: "/", title: "Overview" },
      { href: "/docs/", title: "Docs" },
      { href: "/pricing/", title: "Plans" },
    ],
  },
];

function isActivePath(pathname, href) {
  const path = (pathname || "/").replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";
  return path === target;
}

function groupIsActive(pathname, items) {
  return items.some(
    (item) => !item.external && isActivePath(pathname, item.href),
  );
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
  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const close = () => {
      setDrawer(false);
      setOpenMenu(null);
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
    if (!drawer && !openMenu) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setDrawer(false);
        setOpenMenu(null);
      }
    };
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    if (drawer) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
      document.body.style.overflow = "";
    };
  }, [drawer, openMenu]);

  function toggleMenu(id) {
    setOpenMenu((cur) => (cur === id ? null : id));
  }

  return (
    <nav
      ref={rootRef}
      className={`nav${drawer ? " is-open" : ""}`}
      aria-label="Primary"
    >
      <div className="nav-bar">
        <div className="nav-logo">
          <SiteBrand onClick={() => setDrawer(false)} />
        </div>

        <button
          type="button"
          className={`nav-toggle${drawer ? " is-open" : ""}`}
          aria-expanded={drawer}
          aria-controls="site-nav-links"
          onClick={() => {
            setDrawer((value) => !value);
            setOpenMenu(null);
          }}
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
          {NAV_GROUPS.map((group) => {
            const expanded = openMenu === group.id;
            const current = groupIsActive(router.pathname, group.items);
            return (
              <div
                key={group.id}
                className={`nav-item nav-item--menu${expanded ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="nav-item__btn"
                  aria-expanded={expanded}
                  aria-current={current ? "true" : undefined}
                  onClick={() => toggleMenu(group.id)}
                >
                  {group.title}
                  <span className="nav-item__chev" aria-hidden="true" />
                </button>
                <div className="nav-submenu">
                  {group.items.map((item) =>
                    item.external ? (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setDrawer(false)}
                      >
                        {item.title}
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={
                          isActivePath(router.pathname, item.href)
                            ? "page"
                            : undefined
                        }
                        onClick={() => setDrawer(false)}
                      >
                        {item.title}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            );
          })}
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
