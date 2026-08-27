import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import sharp from "sharp"

import { getActingUser } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
const MAX_BYTES = 4 * 1024 * 1024 // 4MB

// The signature logo renders in a 200×56px box in the email. We normalize the
// upload to 2× that footprint so it stays crisp on HiDPI/retina clients (the
// #1 cause of "fine in preview, fuzzy in the sent email"). Email clients — and
// Gmail's image proxy — resample the logo poorly when it arrives much larger
// than its display size, so we pre-size it here instead.
const MAX_DISPLAY_W = 200
const MAX_DISPLAY_H = 56
const DPR = 2

/**
 * Fit a source image into the display box and produce a crisp, correctly-sized
 * PNG. Rasters keep their native pixels (never upscaled → never blurry); SVGs are
 * rasterized at the target size (many email clients don't render SVG at all).
 */
async function normalizeLogo(
  input: Buffer,
  isSvg: boolean,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // SVGs are vector — rasterize at high density so the 2× output is sharp.
  const pipeline = isSvg ? sharp(input, { density: 288 }) : sharp(input, { animated: false })

  const meta = await pipeline.metadata()
  const srcW = meta.width || MAX_DISPLAY_W
  const srcH = meta.height || MAX_DISPLAY_H

  // 1× display size: fit inside the box. Rasters may only shrink (cap at 1×);
  // SVGs may scale up to fill the box.
  const capOne = isSvg ? Number.POSITIVE_INFINITY : 1
  const scaleFit = Math.min(MAX_DISPLAY_W / srcW, MAX_DISPLAY_H / srcH, capOne)
  const displayW = Math.max(1, Math.round(srcW * scaleFit))
  const displayH = Math.max(1, Math.round(srcH * scaleFit))

  const buffer = await pipeline
    .resize({
      width: displayW * DPR,
      height: displayH * DPR,
      fit: "inside",
      withoutEnlargement: !isSvg,
    })
    .png({ compressionLevel: 9 })
    .toBuffer()

  return { buffer, width: displayW, height: displayH }
}

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

    // Normalize to a retina-ready PNG. If processing fails for any reason, fall
    // back to storing the original so logo upload never hard-fails.
    let body: Buffer = original
    let contentType = file.type || "application/octet-stream"
    let ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    let width = 0
    let height = 0
    try {
      const normalized = await normalizeLogo(original, file.type === "image/svg+xml")
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
