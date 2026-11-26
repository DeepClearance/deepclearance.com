import { checkPost, composePost } from "../lib/x-text.mjs";
import { isPrimaryUrl } from "./config.mjs";
import { normalizeForQuote } from "./evidence.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Returns { ok, reasons, claims } where claims carry source URL, fetch time and content hash.
export function checkDraft(draft, evidence, config) {
  const reasons = [];
  const bySource = new Map(evidence.flatMap((item) => [[item.url, item], [item.finalUrl, item]]));
  const claims = (Array.isArray(draft?.claims) ? draft.claims : []).map((claim) => {
    const item = bySource.get(claim?.sourceUrl);
    const quoteFound = Boolean(item?.text && claim?.quote && normalizeForQuote(claim.quote).length >= 12
      && normalizeForQuote(item.text).includes(normalizeForQuote(claim.quote)));
    return {
      claim: String(claim?.claim || "").slice(0, 1000), quote: String(claim?.quote || "").slice(0, 1000),
      sourceUrl: item?.finalUrl || String(claim?.sourceUrl || ""), fetchedAt: item?.fetchedAt || null,
      sha256: item?.sha256 || null, httpStatus: item?.status || null,
      primary: Boolean(item?.ok) && isPrimaryUrl(item?.finalUrl || "", config.primaryDomains), quoteFound,
    };
  });
  if (!claims.length) reasons.push("No claims.");
  claims.forEach((claim, index) => {
    if (!claim.primary) reasons.push(`Claim ${index + 1} has no fetched primary source.`);
    if (!claim.quoteFound) reasons.push(`Claim ${index + 1} quote is not in the fetched source.`);
  });
  if (!slugPattern.test(draft?.slug || "") || draft.slug.length > 100) reasons.push("Invalid slug.");
  for (const field of ["title", "summary", "xCopy"]) if (!draft?.[field]) reasons.push(`Missing ${field}.`);
  if (!Array.isArray(draft?.paragraphs) || !draft.paragraphs.length) reasons.push("Missing article text.");
  const everything = [draft?.title, draft?.summary, draft?.xCopy, ...(draft?.paragraphs || [])].join("\n").toLowerCase();
  for (const term of config.blocklist) if (everything.includes(term.toLowerCase())) reasons.push(`Blocked term: ${term}`);
  if (draft?.slug && !checkPost(composePost(draft.xCopy, `https://deepclearance.com/dispatches/${draft.slug}/`)).ok) {
    reasons.push("X copy is over 280 weighted characters with the link.");
  }
  return { ok: reasons.length === 0, reasons, claims };
}
