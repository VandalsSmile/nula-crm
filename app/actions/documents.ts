"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { del } from "@vercel/blob"

import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { db } from "@/lib/db"
import { activities, contactDocuments, contacts } from "@/lib/db/schema"
import { isAllowedDocumentType, isBlobUrl, MAX_DOCUMENT_BYTES } from "@/lib/documents"
import { randomId } from "@/lib/library-helpers"
import { mapContactDocument } from "@/lib/mappers"
import { APP_ROUTES } from "@/lib/routes"
import type { ContactDocument } from "@/lib/crm-types"
import { getWorkspaceUserLabels } from "@/lib/workspace-users"

async function assertContactAccess(contactId: string, scopeIds: string[]) {
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!contact) throw new Error("Contact not found")
}

export type NewContactDocument = {
  contactId: string
  url: string
  pathname?: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

/**
 * Record an already-uploaded document against a contact. The file is uploaded
 * directly from the browser to Blob (see the /upload token route); this persists
 * the metadata after that resolves. Re-validates entitlement + contact ownership
 * server-side and only accepts URLs on our Blob store.
 */
export async function addContactDocument(input: NewContactDocument): Promise<ContactDocument> {
  const { user, workspaceId, scopeIds } = await getActingWriter()
  await assertContactAccess(input.contactId, scopeIds)

  const url = input.url?.trim() ?? ""
  if (!isBlobUrl(url)) throw new Error("Invalid upload URL")
  if (input.mimeType && !isAllowedDocumentType(input.mimeType)) {
    throw new Error("Unsupported file type")
  }
  const fileName = (input.fileName || "document").trim().slice(0, 255)
  const sizeBytes = Math.max(0, Math.min(Math.round(input.sizeBytes || 0), MAX_DOCUMENT_BYTES))

  const [row] = await db
    .insert(contactDocuments)
    .values({
      id: randomId("doc"),
      userId: workspaceId,
      contactId: input.contactId,
      fileName,
      mimeType: input.mimeType ?? "",
      sizeBytes,
      url,
      pathname: input.pathname ?? "",
      uploadedBy: user.id,
    })
    .returning()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "document_uploaded",
    message: `Attached document: "${fileName}"`,
    contactId: input.contactId,
    actorId: user.id,
    refType: "document",
    refId: row.id,
  })

  await db
    .update(contacts)
    .set({ lastActivityAt: new Date() })
    .where(eq(contacts.id, input.contactId))

  revalidatePath(`${APP_ROUTES.contacts}/${input.contactId}`)

  const users = await getWorkspaceUserLabels(workspaceId)
  return mapContactDocument(row, users)
}

/** Remove a contact document (deletes the Blob object too, best-effort). */
export async function deleteContactDocument(id: string): Promise<{ ok: true }> {
  const { scopeIds } = await getActingWriter()

  const [row] = await db
    .select()
    .from(contactDocuments)
    .where(and(eq(contactDocuments.id, id), workspaceUserIdMatches(contactDocuments.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Document not found")

  await db.delete(contactDocuments).where(eq(contactDocuments.id, id))

  if (row.url) {
    try {
      await del(row.url)
    } catch {
      // Blob may already be gone; the metadata row is what matters to the UI.
    }
  }

  revalidatePath(`${APP_ROUTES.contacts}/${row.contactId}`)
  return { ok: true }
}
