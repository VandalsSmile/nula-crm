/**
 * The contact fields a client is allowed to set/patch directly. Everything else
 * (id, userId/workspace, revenue, timestamps, lifecycle counters, etc.) is
 * server-controlled. Foreign-key fields (companyId, locationId, ownerId) are
 * handled separately because they need per-workspace validation — see
 * `lib/contact-refs.ts`.
 */
export const EDITABLE_CONTACT_STRING_FIELDS = [
  "firstName",
  "lastName",
  "companyName",
  "email",
  "phone",
  "websiteUrl",
  "address",
  "city",
  "state",
  "zip",
  "source",
  "lifecycleStage",
  "notes",
  "productsPurchased",
] as const

/**
 * Build a DB patch containing ONLY client-editable contact columns from raw
 * input. Prevents mass-assignment: unknown/protected keys (e.g. `userId`,
 * `totalRevenueCents`, `createdAt`) are dropped even if present at runtime.
 * `leadScore` is coerced to a non-negative integer. FKs are intentionally
 * excluded — validate and apply those separately.
 */
export function pickEditableContactFields(
  input: Record<string, unknown>,
): Record<string, string | number> {
  const patch: Record<string, string | number> = {}
  for (const key of EDITABLE_CONTACT_STRING_FIELDS) {
    const value = input[key]
    if (value !== undefined) patch[key] = typeof value === "string" ? value : String(value ?? "")
  }
  if (input.leadScore !== undefined) {
    const n = Number(input.leadScore)
    patch.leadScore = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
  }
  return patch
}
