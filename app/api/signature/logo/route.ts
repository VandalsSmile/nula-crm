import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

import { getActingUser } from "@/lib/auth-helpers"
import { normalizeLogoBuffer } from "@/lib/email/logo-image"
import { randomId } from "@/lib/library-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
const MAX_BYTES = 4 * 1024 * 1024 // 4MB

/** Upload a personal email-signature logo to Blob storage. Any signed-in user. */
export async function POST(request: NextRequest) {
  let userId: string
  try {
    ;({
      user: { id: userId },
    } = await getActingUser())
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 })
    }

    const original = Buffer.from(await file.arrayBuffer())

    // Normalize to a small, retina-ready PNG. If processing fails for any reason,
    // fall back to storing the original so logo upload never hard-fails.
    let body: Buffer = original
    let contentType = file.type || "application/octet-stream"
    let ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    let width = 0
    let height = 0
    try {
      const normalized = await normalizeLogoBuffer(original, file.type === "image/svg+xml")
      body = normalized.buffer
      contentType = "image/png"
      ext = ".png"
      width = normalized.width
      height = normalized.height
    } catch {
      // keep original
    }

    const blob = await put(`signature-logos/${userId}/${randomId("siglogo")}${ext}`, body, {
      access: "public",
      contentType,
    })

    return NextResponse.json({ url: blob.url, width, height })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
