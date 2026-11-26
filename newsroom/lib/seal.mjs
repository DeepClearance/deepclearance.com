// AES-256-GCM sealing for values that must live in D1 but must never sit there in plain text
// (the rotating X refresh token). The key is the Worker secret X_TOKEN_KEY: 32 random bytes, base64.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function importKey(secret) {
  const raw = secret ? unb64(secret) : null;
  if (!raw || raw.byteLength !== 32) throw new Error("X_TOKEN_KEY must be 32 random bytes, base64-encoded.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(secret, plaintext, label) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(label) }, await importKey(secret), encoder.encode(plaintext));
  return { iv: b64(iv), ciphertext: b64(ciphertext) };
}

export async function unseal(secret, { iv, ciphertext }, label) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: encoder.encode(label) }, await importKey(secret), unb64(ciphertext));
  return decoder.decode(plaintext);
}

export async function sha256Hex(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Compares two equal-length hex digests without an early exit.
export function digestsEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
