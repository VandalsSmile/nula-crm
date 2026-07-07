#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const path = join(root, "version.json")

const data = JSON.parse(readFileSync(path, "utf8"))
const raw = String(data.version ?? "1.0").trim()
const match = raw.match(/^(\d+)\.(\d+)$/)
if (!match) {
  console.error(`Invalid version format: ${raw} (expected major.minor, e.g. 1.5)`)
  process.exit(1)
}

const major = Number(match[1])
const minor = Number(match[2]) + 1
const next = `${major}.${minor}`

writeFileSync(path, `${JSON.stringify({ version: next }, null, 2)}\n`)
console.log(next)
