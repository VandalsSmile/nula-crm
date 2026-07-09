// Generates PWA icons from the Nula logo mark. Run: node scripts/gen-icons.mjs
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, "..", "public", "icons")
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
