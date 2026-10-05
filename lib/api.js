/** Public connector only. No Worker internals. */
export const MCP_URL = "https://mcp.deepclearance.com/mcp";
export const WORKER_ORIGIN = "https://mcp.deepclearance.com";
/** Must match Worker wrangler BITCOIN_NETWORK. */
export const BITCOIN_NETWORK = "mainnet";

/** Live index. 530,863 passages. */
export const CORPUS = {
  curated: "filings, files, and books",
  curatedShort: "documents",
  record: "interviews and talks",
  recordShort: "interviews",
  total: "about 531,000",
};

export const INDEX_CURATED = [
  "Court records and FOIA releases",
  "CIA and FBI files, and the public patents",
  "AARO, ODNI, and DoD reports, and the hearings",
  "Blue Book, the Condon report, and the AAWSAP papers",
  "SFFAS 56 and the black-budget record",
  "Books and compilations, including the deep state encyclopedia",
  "Chemical, pharmaceutical, and fossil-fuel industry documents from the public UCSF library",
  "Agency press releases and public wire articles, as the outlet published them",
  "The analysis of capture and suppression",
];

export const INDEX_RECORD = [
  "Long interviews from Dark Journalist, Walter Bosley, Richard Dolan, and the Solari Report",
  "Coast to Coast AM on the official YouTube channel, when captions are available",
  "To The Stars, NewsNation, Jeremy Corbell, Mystery Wire, and The Black Vault",
  "Other shows, when the episode stays on this record",
];

export const INDEX_OUT = [
  "Classified documents",
];

/** Checkout SKUs. */
export const PLANS = [
  {
    id: "trial",
    label: "Trial",
    blurb: "A week on the index.",
    includes: [
      "Filings, files, books, and interviews",
      "Search, stored passages, and claim checks",
      "50 queries per day",
    ],
    options: [{ id: "trial", days: 7, sats: 15_000 }],
  },
  {
    id: "researcher",
    label: "Researcher",
    blurb: "The same index, more days and more queries.",
    includes: [
      "Same index as Trial",
      "250 queries per day",
    ],
    options: [
      { id: "researcher", days: 30, sats: 50_000 },
      { id: "researcher_90", days: 90, sats: 128_000 },
      { id: "researcher_180", days: 180, sats: 240_000 },
      { id: "researcher_365", days: 365, sats: 456_000 },
    ],
  },
  {
    id: "developer",
    label: "Control",
    blurb: "The same index, with the higher daily cap.",
    includes: [
      "Same index as Researcher",
      "500 queries per day",
    ],
    featured: true,
    options: [
      { id: "developer", days: 30, sats: 100_000 },
      { id: "developer_90", days: 90, sats: 255_000 },
      { id: "developer_180", days: 180, sats: 480_000 },
      { id: "developer_365", days: 365, sats: 913_000 },
    ],
  },
];

export const PACKAGES = PLANS.flatMap((plan) =>
  plan.options.map((opt) => ({
    id: opt.id,
    label:
      plan.id === "trial" || opt.days === 30
        ? plan.label
        : `${plan.label} ${opt.days}d`,
    sats: opt.sats,
    days: opt.days,
    tools: plan.blurb,
    planId: plan.id,
  })),
);

export function planBySku(sku) {
  for (const plan of PLANS) {
    const opt = plan.options.find((o) => o.id === sku);
    if (opt) return { plan, opt };
  }
  return { plan: PLANS[0], opt: PLANS[0].options[0] };
}

const TIER_RANK = { trial: 0, researcher: 1, developer: 2 };

export function skuForTier(tier) {
  if (tier === "developer") return "developer";
  if (tier === "trial") return "trial";
  return "researcher";
}

export function activeSku(user) {
  if (!user?.has_key) return null;
  if (user.key_package && PACKAGES.some((p) => p.id === user.key_package)) {
    return user.key_package;
  }
  if (user.key_tier) return skuForTier(user.key_tier);
  return skuForTier("researcher");
}

export function isUpgradeSku(fromId, toId) {
  const from = PACKAGES.find((p) => p.id === fromId);
  const to = PACKAGES.find((p) => p.id === toId);
  if (!from || !to) return true;
  const delta = (TIER_RANK[to.planId] ?? 0) - (TIER_RANK[from.planId] ?? 0);
  if (delta > 0) return true;
  if (delta < 0) return false;
  return to.days > from.days;
}

export function upgradeSats(fromId, toId) {
  const from = PACKAGES.find((p) => p.id === fromId);
  const to = PACKAGES.find((p) => p.id === toId);
  if (!to) return 0;
  if (!from) return to.sats;
  return Math.max(1, to.sats - from.sats);
}

export function upgradeSkus(fromId) {
  return PACKAGES.filter((p) => isUpgradeSku(fromId, p.id));
}

export async function sendSupport({ email, message, name, company }) {
  const res = await fetch(`${WORKER_ORIGIN}/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, message, name, company }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || "send_failed");
    err.status = res.status;
    throw err;
  }
  return body;
}