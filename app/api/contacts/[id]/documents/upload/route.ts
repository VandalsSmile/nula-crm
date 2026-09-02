import { type NextRequest, NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { and, eq } from "drizzle-orm"

import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { db } from "@/lib/db"
import { contacts } from "@/lib/db/schema"
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/documents"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Mints a short-lived client upload token so the browser uploads the file
 * directly to Vercel Blob (bypassing the ~4.5MB serverless request-body limit —
 * important for PDFs/DOCX). We authorize here (workspace can write + owns the
 * contact) and constrain content types + max size. The DB row is persisted by
 * the `addContactDocument` server action after the client upload resolves
 * (onUploadCompleted isn't reliable on localhost).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Only an entitled workspace member who owns this contact may upload.
        const { scopeIds } = await getActingWriter()
        const [contact] = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
          .limit(1)
        if (!contact) throw new Error("Contact not found")
        return {
          allowedContentTypes: [...ALLOWED_DOCUMENT_TYPES],
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          addRandomSuffix: true,
        }
      },
      // Persistence happens in the addContactDocument action; nothing to do here.
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload authorization failed" },
      { status: 400 },
    )
  }
}
