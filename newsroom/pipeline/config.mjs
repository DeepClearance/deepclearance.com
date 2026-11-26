import cadenceDefaults from "../config/cadence.json" with { type: "json" };
import sourceDefaults from "../config/sources.json" with { type: "json" };

// Absolute ceiling for X posts per hour. Config can lower it, never raise it.
export const HARD_MAX_PER_HOUR = 6;

function parse(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { throw new Error("A pipeline JSON setting is not valid JSON."); }
}

export function loadConfig(env) {
  const cadence = { ...cadenceDefaults, ...parse(env.CADENCE_JSON, {}) };
  cadence.maxPerHour = Math.min(Number(cadence.maxPerHour) || 1, HARD_MAX_PER_HOUR);
  return {
    cadence,
    sources: parse(env.SOURCES_JSON, sourceDefaults.sources),
    leadAccounts: parse(env.LEAD_ACCOUNTS_JSON, sourceDefaults.leadAccounts),
    primaryDomains: parse(env.PRIMARY_DOMAINS_JSON, sourceDefaults.primaryDomains),
    blocklist: [...sourceDefaults.blocklist, ...parse(env.BLOCKLIST_JSON, [])],
  };
}

// Queue is the default and the only mode unless BOTH switches are set by the owner:
// POSTING_MODE = "auto" and AUTO_POSTING_ENABLED = "true". Anything else is queue.
export function postingMode(env) {
  return env.POSTING_MODE === "auto" && env.AUTO_POSTING_ENABLED === "true" ? "auto" : "queue";
}

export function isPrimaryUrl(url, domains) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;
    return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch { return false; }
}
