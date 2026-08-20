import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { enrichmentRuns } from "@/lib/db/schema"
import { clayToNormalized, getClayCallbackSecret } from "@/lib/enrichment/provider"
import { processEnrichmentResult } from "@/lib/enrichment/process"

export const runtime = "nodejs"

/**
 * Clay's HTTP API column POSTs enriched results here. We correlate by the
 * `_correlation_id` we sent, verify the workspace's shared callback secret,
 * respond 200 quickly, and apply the result. Idempotent — duplicate callbacks
 * for a completed run are no-ops.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }

  const correlationId =
    (body._correlation_id as string) ||
    (body.correlation_id as string) ||
    (body.correlationId as string) ||
    ""
  if (!correlationId) {
    return NextResponse.json({ ok: false, error: "Missing correlation id" }, { status: 400 })
  }

  const [run] = await db
    .select()
    .from(enrichmentRuns)
    .where(eq(enrichmentRuns.correlationId, correlationId))
    .limit(1)
  if (!run) {
    // Unknown correlation id — ack so Clay doesn't retry forever.
    return NextResponse.json({ received: true })
  }

  // Verify the workspace's shared callback secret (from header or body).
  const expected = await getClayCallbackSecret(run.userId)
  if (expected) {
    const provided =
      request.headers.get("x-clay-signature") ||
      request.headers.get("x-clay-secret") ||
      (body._secret as string) ||
      ""
    if (provided !== expected) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
    }
  }

  try {
    const normalized = clayToNormalized(body)
    await processEnrichmentResult(run, body, normalized)
  } catch (err) {
    await db
      .update(enrichmentRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : "callback failed",
        completedAt: new Date(),
      })
      .where(eq(enrichmentRuns.id, run.id))
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
