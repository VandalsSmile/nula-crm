/**
 * A unique, unguessable id/token with a readable prefix. Uses the Web Crypto
 * RNG (`globalThis.crypto`, available in Node, edge, and browsers) instead of
 * `Math.random`, because some of these ids double as security tokens exposed in
 * URLs/emails — most notably lead-source `publicKey`s used in the public
 * `/api/lead/{key}` intake endpoint. ~80 bits of entropy in a lowercase
 * alphanumeric string.
 */
export function randomId(prefix: string) {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  let out = ""
  for (const b of bytes) out += b.toString(36).padStart(2, "0")
  return `${prefix}_${out.slice(0, 20)}`
}
