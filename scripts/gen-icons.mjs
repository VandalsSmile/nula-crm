// Generates PWA icons + favicon from the Nula logo mark. Run: node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, "..", "public", "icons")
const appDir = join(__dirname, "..", "app")
mkdirSync(outDir, { recursive: true })

function defs(k) {
  return `<defs><linearGradient id="g" x1="${8 * k}" y1="${4 * k}" x2="${34 * k}" y2="${36 * k}" gradientUnits="userSpaceOnUse"><stop stop-color="#4F3DF5"/><stop offset="1" stop-color="#1B1533"/></linearGradient></defs>`
}
function mark(k) {
  return `<circle cx="${20 * k}" cy="${20 * k}" r="${9 * k}" fill="none" stroke="#F7F6FB" stroke-width="${3.5 * k}" stroke-linecap="round" stroke-dasharray="${48 * k} ${18 * k}" transform="rotate(-35 ${20 * k} ${20 * k})"/><circle cx="${27.5 * k}" cy="${14.5 * k}" r="${2.75 * k}" fill="#33E5C4"/>`
}
function anySvg(s) {
  const k = s / 40
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${defs(k)}<rect width="${s}" height="${s}" fill="url(#g)"/>${mark(k)}</svg>`
}
function maskableSvg(s) {
  const k = s / 40
  const c = s / 2
  // Full-bleed gradient background; mark scaled into the ~80% safe zone.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${defs(k)}<rect width="${s}" height="${s}" fill="url(#g)"/><g transform="translate(${c} ${c}) scale(0.72) translate(${-c} ${-c})">${mark(k)}</g></svg>`
}
// Rounded-tile variant for the browser-tab favicon (matches the app Logo mark).
function roundedSvg(s) {
  const k = s / 40
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${defs(k)}<rect width="${s}" height="${s}" rx="${10 * k}" fill="url(#g)"/>${mark(k)}</svg>`
}

const jobs = [
  { name: "icon-192.png", svg: anySvg(192) },
  { name: "icon-512.png", svg: anySvg(512) },
  { name: "icon-maskable-512.png", svg: maskableSvg(512) },
  { name: "apple-touch-icon.png", svg: anySvg(180) },
]

for (const job of jobs) {
  await sharp(Buffer.from(job.svg)).png().toFile(join(outDir, job.name))
  console.log("wrote", job.name)
}

// favicon.ico — multi-resolution ICO embedding PNG frames (16/32/48px),
// which every modern browser supports. Placed in app/ so Next.js serves it at /favicon.ico.
const faviconSizes = [16, 32, 48]
const frames = await Promise.all(
  faviconSizes.map((s) => sharp(Buffer.from(roundedSvg(s))).png().toBuffer()),
)

function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  const entries = []
  let offset = 6 + images.length * 16
  for (let i = 0; i < images.length; i++) {
    const { size, data } = images[i]
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // palette count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(data.length, 8) // size of image data
    entry.writeUInt32LE(offset, 12) // offset of image data
    entries.push(entry)
    offset += data.length
  }

  return Buffer.concat([header, ...entries, ...images.map((im) => im.data)])
}

const ico = buildIco(frames.map((data, i) => ({ size: faviconSizes[i], data })))
writeFileSync(join(appDir, "favicon.ico"), ico)
console.log("wrote favicon.ico")
