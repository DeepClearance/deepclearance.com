import { WORKER_ORIGIN } from "./api";

const SESSION_KEY = "intel_session";

function api() {
  return WORKER_ORIGIN.replace(/\/$/, "");
}

function storedSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setStoredSession(token) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function stripAuthHash() {
  const hash = location.hash;
  const cleaned = hash
    .replace(/^[?#]/, "")
    .replace(/[?&]?intel_code=[^&]*/g, "")
    .replace(/^&/, "");
  const nextHash = cleaned ? `#${cleaned}` : "";
  history.replaceState(
    null,
    "",
    `${location.pathname}${location.search}${nextHash}`,
  );
}

export async function consumeSessionFromHash() {
  const match = location.hash.match(/intel_code=([^&]+)/);
  if (!match) return false;
  const code = decodeURIComponent(match[1]);
  stripAuthHash();
  try {
    const res = await fetch(`${api()}/auth/session/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) return false;
    setStoredSession(data.token);
    return true;
  } catch {
    return false;
  }
}

export function authFetch(input, init = {}) {
  const headers = new Headers(init.headers);
  const token = storedSession();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, credentials: "include" });
}

export function githubLoginUrl(returnPath = "/account") {
  if (typeof window === "undefined") return "#";
  const dest = `${window.location.origin}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;
  return `${api()}/auth/github?return_to=${encodeURIComponent(dest)}`;
}

export async function fetchMe() {
  const res = await authFetch(`${api()}/auth/me`);
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  return data.user || null;
}

export async function fetchAccountKey() {
  const res = await authFetch(`${api()}/account/key`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `key (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchGithubInstalls() {
  const res = await authFetch(`${api()}/account/github-installs`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `github installs (${res.status})`);
  }
  return data;
}

export async function armGithubInstall(id) {
  const res = await authFetch(
    `${api()}/account/github-installs/${encodeURIComponent(id)}/arm`,
    { method: "POST" },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `arm (${res.status})`);
  }
  return data;
}

export async function fetchReferral() {
  const res = await authFetch(`${api()}/account/referral`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `referral (${res.status})`);
  }
  return data;
}

export async function revokeReferral() {
  const res = await authFetch(`${api()}/account/referral/revoke`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `revoke (${res.status})`);
  }
  return data;
}

export async function logout() {
  try {
    await authFetch(`${api()}/auth/logout`, { method: "POST" });
  } finally {
    clearStoredSession();
  }
}

function nip07() {
  return window.nostr || null;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function nostrAuthHeader(event) {
  return `Nostr ${btoa(JSON.stringify(event))}`;
}

export function formatNostrLoginError(err) {
  const message = err instanceof Error ? err.message : String(err || "");
  if (/user rejected|denied|cancel|rejected by user|approval/i.test(message)) {
    return "Nostr signing was cancelled.";
  }
  if (/no nostr extension|nip-07|window\.nostr/i.test(message)) {
    return message;
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Could not reach the login API. Check your connection and try again.";
  }
  return message || "Nostr login failed";
}

/** Challenge-wrapped NIP-98 via NIP-07 (Alby, nos2x). Same as Plebly. */
export async function loginWithNostr() {
  const ext = nip07();
  if (!ext?.signEvent) {
    throw new Error(
      "No Nostr extension found. Install a NIP-07 signer (Alby, nos2x, or similar), then try again.",
    );
  }

  let chalRes;
  try {
    chalRes = await fetch(`${api()}/auth/nostr/challenge`, {
      credentials: "include",
    });
  } catch (err) {
    throw new Error(formatNostrLoginError(err));
  }
  if (chalRes.status === 503) {
    throw new Error("Nostr login temporarily unavailable. Try again shortly.");
  }
  if (!chalRes.ok) throw new Error("Could not start Nostr login");
  const { challenge } = await chalRes.json();
  if (!challenge || !/^[a-f0-9]{16,128}$/i.test(challenge)) {
    throw new Error("Nostr challenge missing");
  }

  const authUrl = new URL(`${api()}/auth/nostr`);
  authUrl.searchParams.set("challenge", challenge);
  const url = authUrl.toString();
  const body = JSON.stringify({ challenge });
  const payloadHash = await sha256Hex(body);

  const unsigned = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["u", url],
      ["method", "POST"],
      ["payload", payloadHash],
    ],
    content: "",
  };

  let signed;
  try {
    signed = await ext.signEvent(unsigned);
  } catch (err) {
    throw new Error(formatNostrLoginError(err));
  }

  if (!signed?.sig || !signed.pubkey) {
    throw new Error("Nostr signer returned an incomplete event");
  }
  const pubkey = String(signed.pubkey).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pubkey)) {
    throw new Error("Nostr signer returned an invalid pubkey");
  }
  if (signed.kind !== 27235) {
    throw new Error("Nostr signer returned the wrong event kind");
  }
  const signedUrl = signed.tags?.find((tag) => tag[0] === "u")?.[1];
  const signedMethod = signed.tags?.find((tag) => tag[0] === "method")?.[1];
  if (signedUrl !== url || String(signedMethod || "").toUpperCase() !== "POST") {
    throw new Error("Nostr signer altered the login request");
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: nostrAuthHeader(signed),
      },
      body,
    });
  } catch (err) {
    throw new Error(formatNostrLoginError(err));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        data.error === "invalid or expired challenge"
          ? "Nostr login expired. Try again."
          : "Nostr signature was rejected. Try again.",
      );
    }
    throw new Error(data.error || `Nostr login failed (${res.status})`);
  }
  if (!data.token) throw new Error("Nostr login succeeded but no session token returned");
  setStoredSession(data.token);
}
