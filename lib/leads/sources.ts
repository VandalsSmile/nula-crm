import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { leadEvents, leadSources } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"

export type LeadChannel = "web_form" | "email" | "call" | "webhook" | "csv" | "api"

export type SourceContext = {
  key: string
  name?: string
  channel?: LeadChannel
  defaults?: { tagSlug?: string; groupName?: string }
}

/** Built-in sources auto-created the first time a channel ingests a lead. */
export const DEFAULT_SOURCES: Record<
  string,
  { name: string; channel: LeadChannel; defaults: { tagSlug: string; groupName: string } }
> = {
  "website-form": {
    name: "Website form",
    channel: "web_form",
    defaults: { tagSlug: "source-website-form", groupName: "New Leads" },
  },
  webhook: {
    name: "Webhook",
    channel: "webhook",
    defaults: { tagSlug: "source-webhook", groupName: "New Leads" },
  },
  "csv-import": {
    name: "CSV import",
    channel: "csv",
    defaults: { tagSlug: "source-csv", groupName: "New Leads" },
  },
  inbox: {
    name: "Inbox",
    channel: "email",
    defaults: { tagSlug: "source-inbox", groupName: "New Leads" },
  },
}

export type LeadSourceRow = typeof leadSources.$inferSelect

/** Get-or-create the lead source for a workspace + key. */
export async function ensureLeadSource(
  workspaceId: string,
  ctx: SourceContext,
): Promise<LeadSourceRow> {
  const [existing] = await db
    .select()
    .from(leadSources)
    .where(and(eq(leadSources.userId, workspaceId), eq(leadSources.key, ctx.key)))
    .limit(1)
  if (existing) return existing

  const preset = DEFAULT_SOURCES[ctx.key]
  await db
    .insert(leadSources)
    .values({
      id: randomId("src"),
      userId: workspaceId,
      key: ctx.key,
      name: ctx.name ?? preset?.name ?? ctx.key,
      channel: ctx.channel ?? preset?.channel ?? "webhook",
      defaults: ctx.defaults ?? preset?.defaults ?? {},
    })
    .onConflictDoNothing()

  const [row] = await db
    .select()
    .from(leadSources)
    .where(and(eq(leadSources.userId, workspaceId), eq(leadSources.key, ctx.key)))
    .limit(1)
  return row
}

export function dedupeHash(email?: string, phone?: string): string {
  const e = (email ?? "").trim().toLowerCase()
  const p = (phone ?? "").replace(/\D/g, "")
  return [e, p].filter(Boolean).join("|")
}

/** Records a received lead event. Returns the event id (or null if a duplicate
 * externalId was already ingested for this source). */
export async function recordLeadEvent(input: {
  workspaceId: string
  sourceId: string
  channel: string
  externalId?: string
  dedupeHash?: string
  payload: Record<string, unknown>
}): Promise<string | null> {
  const id = randomId("evt")
  const inserted = await db
    .insert(leadEvents)
    .values({
      id,
      userId: input.workspaceId,
      sourceId: input.sourceId,
      channel: input.channel,
      externalId: input.externalId ?? "",
      dedupeHash: input.dedupeHash ?? "",
      status: "received",
      payload: input.payload,
    })
    .onConflictDoNothing()
    .returning({ id: leadEvents.id })
  return inserted[0]?.id ?? null
}

export async function markLeadEvent(
  eventId: string,
  patch: { status: string; contactId?: string; error?: string },
) {
  await db
    .update(leadEvents)
    .set({ status: patch.status, contactId: patch.contactId, error: patch.error ?? "" })
    .where(eq(leadEvents.id, eventId))
}

/** Resolve a source (and thus its workspace) from a global public key. */
export async function resolveSourceByPublicKey(publicKey: string): Promise<LeadSourceRow | null> {
  if (!publicKey.trim()) return null
  const [row] = await db
    .select()
    .from(leadSources)
    .where(eq(leadSources.publicKey, publicKey.trim()))
    .limit(1)
  return row ?? null
}

function slugKey(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "source"
  )
}

/** Create a configurable source (e.g. a web-form embed) with a public key. */
export async function createLeadSource(
  workspaceId: string,
  input: {
    name: string
    channel: LeadChannel
    successMessage?: string
    redirectUrl?: string
    fieldMapping?: Record<string, string>
    secret?: string
  },
): Promise<LeadSourceRow> {
  const base = slugKey(input.name)
  // Ensure the per-workspace key is unique.
  const existing = await db
    .select({ key: leadSources.key })
    .from(leadSources)
    .where(eq(leadSources.userId, workspaceId))
  const taken = new Set(existing.map((e) => e.key))
  let key = base
  let n = 2
  while (taken.has(key)) key = `${base}-${n++}`

  const [row] = await db
    .insert(leadSources)
    .values({
      id: randomId("src"),
      userId: workspaceId,
      key,
      name: input.name.trim(),
      channel: input.channel,
      publicKey: randomId("lf") + randomId("k"),
      secret: input.secret ?? "",
      successMessage: input.successMessage ?? "",
      redirectUrl: input.redirectUrl ?? "",
      fieldMapping: input.fieldMapping ?? {},
      defaults: { tagSlug: `source-${key}`, groupName: "New Leads" },
    })
    .returning()
  return row
}

export async function getLeadSourcesForWorkspace(workspaceId: string) {
  return db
    .select()
    .from(leadSources)
    .where(eq(leadSources.userId, workspaceId))
    .orderBy(desc(leadSources.createdAt))
}

export async function getRecentLeadEvents(workspaceId: string, limit = 25) {
  return db
    .select()
    .from(leadEvents)
    .where(eq(leadEvents.userId, workspaceId))
    .orderBy(desc(leadEvents.createdAt))
    .limit(limit)
}
