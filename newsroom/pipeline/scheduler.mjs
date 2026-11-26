import { loadConfig, postingMode } from "./config.mjs";
import { settingsStore } from "./settings.mjs";

const sqlTime = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const inWindow = (hour, [start, end]) => start <= end ? hour >= start && hour < end : hour >= start || hour < end;

export async function killSwitchOn(env) {
  return env.POSTING_KILL_SWITCH === "on" || (await settingsStore(env).get("kill_switch")) === "on";
}

// Decides whether an X post may go out now. Returns null, or { kind: "kill" | "rate", reason }.
// Applies in both modes: the kill switch, the hourly hard cap, the minimum gap and the daily target.
// Quiet hours and off-peak spacing apply to automatic posts only; an approval made then is scheduled.
export async function gate(env, now = Date.now(), mode = postingMode(env)) {
  if (await killSwitchOn(env)) return { kind: "kill", reason: "Posting is stopped by the kill switch." };
  const { cadence } = loadConfig(env);
  const count = async (sinceMs) => (await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM x_distribution WHERE status IN ('posted','sending','uncertain') AND updated_at >= ?",
  ).bind(sqlTime(sinceMs)).first()).n;
  if (await count(now - 3600_000) >= cadence.maxPerHour) return { kind: "rate", reason: `Hourly cap of ${cadence.maxPerHour} reached.` };
  if (await count(now - 86400_000) >= cadence.postsPerDay) return { kind: "rate", reason: `Daily target of ${cadence.postsPerDay} reached.` };
  const hour = new Date(now).getUTCHours();
  const peak = cadence.peakWindowsUtc.some((window) => inWindow(hour, window));
  const gapMinutes = cadence.minGapMinutes * (mode === "auto" && !peak ? cadence.offPeakGapMultiplier : 1);
  const last = await env.DB.prepare(
    "SELECT MAX(updated_at) AS at FROM x_distribution WHERE status IN ('posted','sending','uncertain')",
  ).first();
  if (last?.at && Date.parse(`${last.at.replace(" ", "T")}Z`) > now - gapMinutes * 60_000) {
    return { kind: "rate", reason: `Minimum gap of ${gapMinutes} minutes since the last post.` };
  }
  if (mode === "auto" && inWindow(hour, cadence.quietHoursUtc)) return { kind: "rate", reason: "Quiet hours." };
  return null;
}
