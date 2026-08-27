import "server-only"

import { put } from "@vercel/blob"
import sharp from "sharp"

import { LOGO_MAX_HEIGHT, LOGO_MAX_WIDTH } from "@/lib/email/signature-render"
import { randomId } from "@/lib/library-helpers"

// The logo renders in a small box in the email. We physically resize the stored
// image to ~2× that box (a retina-ready PNG) so it is (a) crisp on HiDPI clients
// and (b) never larger than ~1 inch even in clients that ignore width/height —
// because the file itself is small. Physical height is capped at 2× the box
// height, i.e. ≈ 1 inch.
const DPR = 2

export type NormalizedLogo = { buffer: Buffer; width: number; height: number }

/**
 * Fit a source image into the display box and produce a crisp, correctly-sized
 * PNG. Rasters keep their native pixels (never upscaled → never blurry); SVGs are
 * rasterized at the target size (many email clients don't render SVG at all).
 * Returns the buffer plus the intended 1× display dimensions.
 */
export async function normalizeLogoBuffer(input: Buffer, isSvg: boolean): Promise<NormalizedLogo> {
  const pipeline = isSvg ? sharp(input, { density: 288 }) : sharp(input, { animated: false })

  const meta = await pipeline.metadata()
  const srcW = meta.width || LOGO_MAX_WIDTH
  const srcH = meta.height || LOGO_MAX_HEIGHT

  // 1× display size: fit inside the box. Rasters may only shrink (cap at 1×);
  // SVGs may scale up to fill the box.
  const capOne = isSvg ? Number.POSITIVE_INFINITY : 1
  const scaleFit = Math.min(LOGO_MAX_WIDTH / srcW, LOGO_MAX_HEIGHT / srcH, capOne)
  const width = Math.max(1, Math.round(srcW * scaleFit))
  const height = Math.max(1, Math.round(srcH * scaleFit))

  const buffer = await pipeline
    .resize({ width: width * DPR, height: height * DPR, fit: "inside", withoutEnlargement: !isSvg })
    .png({ compressionLevel: 9 })
    .toBuffer()

  return { buffer, width, height }
}

/**
 * Re-normalize a logo already stored at a URL: download it, shrink it to the
 * standard footprint, and upload the small version. Used to fix logos uploaded
 * before we resized the actual image (so the stored file — not just the CSS — is
 * small). Returns null if the source can't be fetched.
 */
export async function normalizeStoredLogo(
  userId: string,
  url: string,
): Promise<{ url: string; width: number; height: number } | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const input = Buffer.from(await res.arrayBuffer())
  const isSvg = /\.svg(\?|$)/i.test(url) || input.subarray(0, 400).toString("utf8").includes("<svg")

  const normalized = await normalizeLogoBuffer(input, isSvg)
  const blob = await put(`signature-logos/${userId}/${randomId("siglogo")}.png`, normalized.buffer, {
    access: "public",
    contentType: "image/png",
  })
  return { url: blob.url, width: normalized.width, height: normalized.height }
}
