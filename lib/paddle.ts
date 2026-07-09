import "server-only"

import { Environment, Paddle } from "@paddle/paddle-node-sdk"

let cached: Paddle | null = null

/** Whether Paddle billing is configured on the server. */
export function isPaddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY?.trim())
}

/** Lazily-constructed Paddle client. Throws a clear error when unconfigured. */
export function getPaddle(): Paddle {
  const key = process.env.PADDLE_API_KEY?.trim()
  if (!key) {
    throw new Error("Billing isn't set up yet. Add PADDLE_API_KEY to enable payments.")
  }
  if (!cached) {
    const environment =
      process.env.PADDLE_ENV?.trim() === "production" ? Environment.production : Environment.sandbox
    cached = new Paddle(key, { environment })
  }
  return cached
}
