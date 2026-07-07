import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { decryptIntegrationSecret } from "@/lib/integration-secrets"
import { getWorkspaceScopeIds, workspaceUserIdMatches } from "@/lib/workspace-scope"

export async function getLacrmApiKeyForClient(
  clientId: string,
  workspaceId: string,
): Promise<string> {
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  const [row] = await db
    .select({
      apiKeyEnc: clients.lacrmApiKeyEnc,
      status: clients.lacrmStatus,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), workspaceUserIdMatches(clients.userId, scopeIds)))
    .limit(1)

  if (!row) throw new Error("Client not found")
  if (row.status !== "Connected" || !row.apiKeyEnc) {
    throw new Error("This client is not connected to Less Annoying CRM.")
  }

  return decryptIntegrationSecret(row.apiKeyEnc)
}
