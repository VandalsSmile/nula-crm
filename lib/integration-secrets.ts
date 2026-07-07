import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12

function getEncryptionKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET?.trim()
  if (!secret) {
    throw new Error("Integration secrets are not configured (missing BETTER_AUTH_SECRET).")
  }
  return createHash("sha256").update(secret).digest()
}

/** Encrypt a third-party API key for storage in the database. */
export function encryptIntegrationSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

/** Decrypt a value produced by `encryptIntegrationSecret`. */
export function decryptIntegrationSecret(ciphertext: string): string {
  const [ivPart, tagPart, dataPart] = ciphertext.split(".")
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Stored integration secret is invalid.")
  }

  const key = getEncryptionKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"))
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
