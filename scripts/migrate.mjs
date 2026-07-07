import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, "migrations")

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    const onVercel = process.env.VERCEL === "1"
    const inCi = process.env.CI === "true" || process.env.CI === "1"
    if (onVercel || inCi) {
      console.error(
        "DATABASE_URL not set — refusing to build without running database migrations",
      )
      process.exit(1)
    }
    console.log("DATABASE_URL not set — skipping database migrations")
    return
  }

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  if (files.length === 0) {
    console.log("No migration files found")
    return
  }

  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf8")
      console.log(`Running migration ${file}...`)
      await pool.query(sql)
      console.log(`Migration ${file} complete`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error("Database migration failed:", error)
  process.exit(1)
})
