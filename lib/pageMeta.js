export const SITE_ORIGIN = "https://deepclearance.com";
export const SITE_NAME = "Deep Clearance";
export const DEFAULT_TITLE = "Deep Clearance";
export const DEFAULT_DESCRIPTION =
  "The suppression is the signal. Cited search over the public UAP, secrecy, and black-budget record. Lightning. Model Context Protocol (MCP).";
export const OG_IMAGE = `${SITE_ORIGIN}/assets/og.png`;
export const ORG_LOGO = `${SITE_ORIGIN}/assets/logo.png`;

const PAGES = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  "/docs": {
    title: "Docs · Deep Clearance",
    description:
      "Connect to Deep Clearance over Model Context Protocol (MCP). Tools and Bearer keys.",
  },
  "/pricing": {
    title: "Plans · Deep Clearance",
    description: "Trial, Researcher, and Control. Pay with Lightning.",
  },
  "/subscribe": {
    title: "Checkout · Deep Clearance",
    description: "Subscribe to Deep Clearance. Lightning checkout.",
  },
  "/account": {
    title: "Account · Deep Clearance",
    description: "Sign in, manage your plan, and copy connector fields.",
  },
  "/terms": {
    title: "Terms · Deep Clearance",
    description: "Terms for Deep Clearance and this website.",
  },
  "/privacy": {
    title: "Privacy · Deep Clearance",
    description: "How Deep Clearance handles account data.",
  },
  "/security": {
    title: "Security · Deep Clearance",
    description: "How Deep Clearance bounds keys, checkout, and the index.",
  },
  "/third-party": {
    title: "Third-party services · Deep Clearance",
    description: "Third-party services used by Deep Clearance.",
  },
  "/support": {
    title: "Support · Deep Clearance",
    description: "Contact Deep Clearance about billing, keys, and checkout.",
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
