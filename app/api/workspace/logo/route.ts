import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

import { requireRole } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"

export const dynamic = "force-dynamic"

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
const MAX_BYTES = 4 * 1024 * 1024 // 4MB

/** Upload a workspace company logo to Blob storage. Admin-only. */
export async function POST(request: NextRequest) {
  let workspaceId: string
  try {
    ;({ workspaceId } = await requireRole("Admin"))
  } catch {
    return NextResponse.json({ error: "Only admins can change the company logo" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 })
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    const blob = await put(`workspace-logos/${workspaceId}/${randomId("logo")}${ext}`, file, {
      access: "public",
      contentType: file.type || undefined,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
