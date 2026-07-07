import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getSessionUser } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"

export const dynamic = "force-dynamic"

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_BYTES = 4 * 1024 * 1024 // 4MB

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PNG, JPEG, WebP, or GIF." },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 4MB or smaller." }, { status: 400 })
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    const blob = await put(`avatars/${user.id}/${randomId("avatar")}${ext}`, file, {
      access: "public",
      contentType: file.type || undefined,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] POST /api/account/avatar failed:", error)
    return NextResponse.json({ error: "Avatar upload failed" }, { status: 500 })
  }
}
