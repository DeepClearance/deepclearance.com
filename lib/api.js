/** Public connector only. No Worker internals. */
export const MCP_URL = "https://mcp.deepclearance.com/mcp";
export const WORKER_ORIGIN = "https://mcp.deepclearance.com";
/** Must match Worker wrangler BITCOIN_NETWORK. */
export const BITCOIN_NETWORK = "mainnet";

/** Live index. 87,851 passages. */
export const CORPUS = {
  curated: "official documents",
  curatedShort: "documents",
  record: "talk transcripts",
  recordShort: "transcripts",
  total: "about 87,900",
};

export const INDEX_CURATED = [
  "Capture, suppression, and the reading of this record",
  "Court records and FOIA releases",
  "Declassified government files and public patents",
  "Public-domain books from the local shelf",
  "AARO, ODNI, and DoD UAP reports",
  "House hearings and written statements",
  "Blue Book Special Report 14 and the Condon report",
  "AAWSAP contract papers and the Wilson/Davis notes",
  "SFFAS 56",
];

export const INDEX_RECORD = [
  "Dark Journalist, Walter Bosley, Richard Dolan, and the Solari Report",
  "To The Stars, NewsNation, Jeremy Corbell, Mystery Wire, and The Black Vault",
  "Other shows, when the episode is about this record",
];

export const INDEX_OUT = [
  "Live news",
  "Classified documents",
];

/** Checkout SKUs. */
export const PLANS = [
  {
    id: "trial",
    label: "Trial",
    blurb: "A week on the index.",
    includes: [
      "Official documents and talk transcripts",
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