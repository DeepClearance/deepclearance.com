export const SITE_ORIGIN = "https://deepclearance.com";
export const SITE_NAME = "Deep Clearance";
export const DEFAULT_TITLE = "Deep Clearance";
export const DEFAULT_DESCRIPTION =
  "About 1,476,000 stored passages from company files, courts, and released files. The answer comes back with the source. Connect over MCP. Pay with Lightning.";
export const OG_IMAGE = `${SITE_ORIGIN}/assets/og.png`;
export const ORG_LOGO = `${SITE_ORIGIN}/assets/logo.png`;

const PAGES = {
  "/": {
    title: "Deep Clearance · cited search over the public record",
    description: DEFAULT_DESCRIPTION,
    shareTitle: "Understand the system. Challenge the narrative.",
    shareDescription:
      "Mainstream AI hedges. Forums don't cite. Deep Clearance returns the passage with the source attached.",
  },
  "/docs": {
    title: "Connect over MCP · Deep Clearance",
    description:
      "Endpoint, tools, and topic pins for Deep Clearance. Claude uses OAuth. Cursor and other clients send a Bearer key. A call without a paid key fails.",
  },
  "/methodology": {
    title: "Evidence standards · Deep Clearance",
    description:
      "S1 to S4 is what a passage can support. T1 to T4 is how far the writeup goes. A connected model has to keep those labels apart and stop when the index is empty.",
  },
  "/pricing": {
    title: "Plans and pricing · Deep Clearance",
    description:
      "Trial is 15,000 sats for 7 days and 50 queries a day. Researcher is 250 a day. Control is 500. Same index on every plan. Pay with Lightning.",
  },
  "/subscribe": {
    title: "Lightning checkout · Deep Clearance",
    description:
      "Sign in with GitHub or Nostr and pay a Lightning invoice. The key lands on that login. An upgrade keeps the same key.",
  },
  "/account": {
    title: "Account · Deep Clearance",
    description: "Sign in, manage your plan, and copy connector fields.",
    robots: "noindex, follow",
  },
  "/terms": {
    title: "Terms · Deep Clearance",
    description:
      "Cited search over a collected public record. Lightning payment, key handling, and the daily query cap.",
  },
  "/privacy": {
    title: "Privacy · Deep Clearance",
    description:
      "What Deep Clearance stores on a login. A GitHub or Nostr identifier, a hashed key, the plan, query counts, and Lightning invoices. Account data is not sold.",
  },
  "/security": {
    title: "Security · Deep Clearance",
    description:
      "Paid keys only. Search returns stored passages and does not fetch the live web. Classified material is outside the index.",
  },
  "/third-party": {
    title: "Third-party services · Deep Clearance",
    description:
      "GitHub, Nostr, OpenNode, Cloudflare, and Resend. What each one sees when you use Deep Clearance.",
  },
  "/support": {
    title: "Support · Deep Clearance",
    description:
      "Billing, keys, and checkout. Write support@deepclearance.com or use the form.",
  },
};

export function pageMeta(pathname) {
  const path = (pathname || "/").replace(/\/$/, "") || "/";
  const page = PAGES[path] || {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
  const url = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}/`;
  return { ...page, url, path };
}
