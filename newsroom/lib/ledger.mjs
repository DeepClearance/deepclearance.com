import { sha256Hex } from "./seal.mjs";

// Approval ledger. Every site publish and every X decision (approve, reject, edit, auto) gets one
// append-only row: who, when, the exact text, its hash, and the revision. The export mirrors the
// APPROVAL lines in the fleet's holds.md so entries can be pasted there unchanged.

const PARAMARIBO_OFFSET_MINUTES = -180; // Suriname has no daylight saving time.

export function paramariboTime(iso) {
  const local = new Date(Date.parse(iso) + PARAMARIBO_OFFSET_MINUTES * 60_000).toISOString();
  return `${local.slice(0, 10)} ${local.slice(11, 16)} Paramaribo`;
}

export async function record(env, entry) {
  const decidedAt = entry.decidedAt || new Date().toISOString();
  const day = paramariboTime(decidedAt).slice(0, 10).replace(/-/g, "");
  const kind = entry.kind === "site_publish" ? "SITE" : "X";
  const ref = `A-${day}-DC-${kind}-${entry.slug}-r${entry.revision}-${entry.decision}`.toUpperCase();
  const text = entry.text || "";
  const result = await env.DB.prepare(
    `INSERT INTO approvals (ref, kind, slug, revision, text, text_sha256, image_key, actor, actor_method, decision, mode, decided_at, note, drafted_text_sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(ref, entry.kind, entry.slug, entry.revision, text, await sha256Hex(text), entry.imageKey || null,
    entry.actor, entry.actorMethod, entry.decision, entry.mode || "queue", decidedAt, entry.note || null,
    entry.draftedText ? await sha256Hex(entry.draftedText) : null).run();
  return { ref, id: result.meta.last_row_id ?? result.meta.lastInsertRowid };
}

export async function setOutcome(env, id, outcome, postId = null) {
  await env.DB.prepare("UPDATE approvals SET outcome = ?, post_id = ? WHERE id = ?").bind(outcome, postId, id).run();
}

export async function list(env, limit = 500) {
  const { results } = await env.DB.prepare("SELECT * FROM approvals ORDER BY id DESC LIMIT ?").bind(limit).all();
  return results;
}

const quote = (text) => `"${String(text).replace(/\s*\n\s*/g, " / ")}"`;

export function toHoldsLine(row) {
  const label = row.decision === "approved" ? "APPROVAL" : row.decision === "auto" ? "AUTO-POST" : "DECISION";
  const action = row.kind === "site_publish" ? "Publish to website" : row.decision === "rejected" ? "Reject X post" : "Approve and publish on X";
  const outcome = row.outcome ? ` | Outcome: ${row.outcome}${row.post_id ? ` https://x.com/i/web/status/${row.post_id}` : ""}` : "";
  return `- ${label} ${row.ref} | ${paramariboTime(row.decided_at)} | ${row.actor} in DC newsroom (${row.actor_method}, mode ${row.mode}): ${quote(action)}`
    + ` | Scope: ${row.kind === "site_publish" ? "site edition" : "X post"} for https://deepclearance.com/dispatches/${row.slug}/ revision ${row.revision}`
    + `${row.kind === "x_post" ? `, exact text sha256 ${row.text_sha256.slice(0, 12)}: ${quote(row.text)}` : ""}`
    + `${row.note ? ` | Note: ${quote(row.note)}` : ""}${outcome}`;
}

// Week-one quality review: per day, X drafts approved as drafted, approved after edits, rejected.
export async function quality(env) {
  const { results } = await env.DB.prepare(
    `SELECT substr(decided_at, 1, 10) AS day,
            SUM(decision = 'approved' AND (drafted_text_sha256 IS NULL OR drafted_text_sha256 = text_sha256)) AS approved_as_drafted,
            SUM(decision = 'approved' AND drafted_text_sha256 IS NOT NULL AND drafted_text_sha256 != text_sha256) AS approved_after_edit,
            SUM(decision = 'rejected') AS rejected,
            SUM(decision = 'auto') AS auto_posted,
            SUM(outcome = 'posted') AS posted
       FROM approvals WHERE kind = 'x_post' GROUP BY day ORDER BY day`,
  ).all();
  const totals = results.reduce((sum, row) => {
    for (const key of Object.keys(row)) if (key !== "day") sum[key] = (sum[key] || 0) + Number(row[key] || 0);
    return sum;
  }, {});
  const decided = (totals.approved_as_drafted || 0) + (totals.approved_after_edit || 0) + (totals.rejected || 0);
  return { days: results, totals, approvalRate: decided ? (totals.approved_as_drafted || 0) / decided : null };
}
