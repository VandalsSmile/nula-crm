import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

import { requireRole } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"

export const dynamic = "force-dynamic"

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

/** Upload a campaign featured image to Blob storage. Admin-only. */
export async function POST(request: NextRequest) {
  let workspaceId: string
  try {
    ;({ workspaceId } = await requireRole("Admin"))
  } catch {
    return NextResponse.json({ error: "Only admins can upload campaign images" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type (use PNG, JPEG, WEBP, or GIF)" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    const blob = await put(`campaign-images/${workspaceId}/${randomId("img")}${ext}`, file, {
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
