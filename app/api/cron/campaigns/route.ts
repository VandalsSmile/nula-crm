import { NextResponse } from "next/server"

import { sharedWorkspaceId } from "@/lib/workspace-scope"
import { processDueCampaignSends } from "@/lib/campaigns/schedule"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production"
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

async function workspaceIdsToProcess(): Promise<string[]> {
  const shared = sharedWorkspaceId()
  if (shared) return [shared]

  const rows = await db.select({ workspaceId: userTable.workspaceId, id: userTable.id }).from(userTable)
  const ids = new Set<string>()
  for (const row of rows) {
    ids.add(row.workspaceId ?? row.id)
  }
  return [...ids]
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workspaceIds = await workspaceIdsToProcess()
  const results = []
  for (const workspaceId of workspaceIds) {
    const processed = await processDueCampaignSends(workspaceId)
    results.push({ workspaceId, ...processed })
  }

  return NextResponse.json({ ok: true, results })
}
