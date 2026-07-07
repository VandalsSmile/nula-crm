import { db } from "@/lib/db"
import {
  activities,
  campaigns,
  contactGroups,
  contacts,
  contactTags,
  deals,
  groups,
  tags,
  workspaceSettings,
} from "@/lib/db/schema"
import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm"
import { getWorkspaceScope, workspaceUserIdMatches } from "@/lib/auth-helpers"
import {
  mapActivity,
  mapCampaign,
  mapContact,
  mapDeal,
  mapGroup,
  mapTag,
} from "@/lib/mappers"
import type { Contact, DashboardStats } from "@/lib/crm-types"
import { getWorkspaceUserLabels } from "@/lib/workspace-users"

async function contactLabels() {
  const { workspaceId } = await getWorkspaceScope()
  return getWorkspaceUserLabels(workspaceId)
}

async function loadContactRelations(contactIds: string[], scopeIds: string[]) {
  if (contactIds.length === 0) return { tagMap: new Map<string, ReturnType<typeof mapTag>[]>(), groupMap: new Map() }

  const [tagLinks, groupLinks, tagRows, groupRows] = await Promise.all([
    db.select().from(contactTags).where(inArray(contactTags.contactId, contactIds)),
    db.select().from(contactGroups).where(inArray(contactGroups.contactId, contactIds)),
    db.select().from(tags).where(workspaceUserIdMatches(tags.userId, scopeIds)),
    db.select().from(groups).where(workspaceUserIdMatches(groups.userId, scopeIds)),
  ])

  const tagById = new Map(tagRows.map((t) => [t.id, mapTag(t)]))
  const groupById = new Map(groupRows.map((g) => [g.id, mapGroup(g)]))

  const tagMap = new Map<string, ReturnType<typeof mapTag>[]>()
  for (const link of tagLinks) {
    const tag = tagById.get(link.tagId)
    if (!tag) continue
    const list = tagMap.get(link.contactId) ?? []
    list.push(tag)
    tagMap.set(link.contactId, list)
  }

  const groupMap = new Map<string, ReturnType<typeof mapGroup>[]>()
  for (const link of groupLinks) {
    const group = groupById.get(link.groupId)
    if (!group) continue
    const list = groupMap.get(link.contactId) ?? []
    list.push(group)
    groupMap.set(link.contactId, list)
  }

  return { tagMap, groupMap }
}

export async function getContacts(search?: string): Promise<Contact[]> {
  const { scopeIds } = await getWorkspaceScope()
  const where = search?.trim()
    ? and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        or(
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.phone, `%${search}%`),
          ilike(contacts.name, `%${search}%`),
        ),
      )
    : workspaceUserIdMatches(contacts.userId, scopeIds)

  const rows = await db.select().from(contacts).where(where).orderBy(desc(contacts.createdAt))
  const { tagMap, groupMap } = await loadContactRelations(
    rows.map((r) => r.id),
    scopeIds,
  )

  return rows.map((row) =>
    mapContact(row, {
      tags: tagMap.get(row.id) ?? [],
      groups: groupMap.get(row.id) ?? [],
    }),
  )
}

export async function getContactById(id: string): Promise<Contact | null> {
  const { scopeIds } = await getWorkspaceScope()
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!row) return null

  const { tagMap, groupMap } = await loadContactRelations([id], scopeIds)
  return mapContact(row, {
    tags: tagMap.get(id) ?? [],
    groups: groupMap.get(id) ?? [],
  })
}

export async function getTags() {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select()
    .from(tags)
    .where(workspaceUserIdMatches(tags.userId, scopeIds))
    .orderBy(tags.name)
  return rows.map(mapTag)
}

export async function getGroups() {
  const { scopeIds } = await getWorkspaceScope()
  const [groupRows, memberCounts] = await Promise.all([
    db.select().from(groups).where(workspaceUserIdMatches(groups.userId, scopeIds)).orderBy(groups.name),
    db
      .select({
        groupId: contactGroups.groupId,
        count: sql<number>`count(*)::int`,
      })
      .from(contactGroups)
      .innerJoin(contacts, eq(contacts.id, contactGroups.contactId))
      .where(workspaceUserIdMatches(contacts.userId, scopeIds))
      .groupBy(contactGroups.groupId),
  ])

  const countMap = new Map(memberCounts.map((r) => [r.groupId, r.count]))
  return groupRows.map((g) => mapGroup(g, countMap.get(g.id) ?? 0))
}

export async function getGroupById(id: string) {
  const { scopeIds } = await getWorkspaceScope()
  const [row] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), workspaceUserIdMatches(groups.userId, scopeIds)))
    .limit(1)
  if (!row) return null

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactGroups)
    .innerJoin(contacts, eq(contacts.id, contactGroups.contactId))
    .where(and(eq(contactGroups.groupId, id), workspaceUserIdMatches(contacts.userId, scopeIds)))

  return mapGroup(row, countRow?.count ?? 0)
}

export async function getActivitiesForContact(contactId: string, limit = 30) {
  const { scopeIds } = await getWorkspaceScope()
  const [rows, contact, labels] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.contactId, contactId),
          workspaceUserIdMatches(activities.userId, scopeIds),
        ),
      )
      .orderBy(desc(activities.at))
      .limit(limit),
    getContactById(contactId),
    contactLabels(),
  ])

  const contactName = contact?.fullName ?? ""
  return rows.map((row) => mapActivity(row, labels, contactName))
}

export async function getCampaigns() {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select()
    .from(campaigns)
    .where(workspaceUserIdMatches(campaigns.userId, scopeIds))
    .orderBy(desc(campaigns.updatedAt))
  return rows.map(mapCampaign)
}

export async function getActivities(limit = 20) {
  const { workspaceId, scopeIds } = await getWorkspaceScope()
  const [rows, contactRows, labels] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(workspaceUserIdMatches(activities.userId, scopeIds))
      .orderBy(desc(activities.at))
      .limit(limit),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, name: contacts.name })
      .from(contacts)
      .where(workspaceUserIdMatches(contacts.userId, scopeIds)),
    contactLabels(),
  ])

  const names = new Map(
    contactRows.map((c) => [c.id, [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name]),
  )
  return rows.map((row) => mapActivity(row, labels, names.get(row.contactId) ?? ""))
}

export async function getDealsForContact(contactId: string) {
  const { scopeIds } = await getWorkspaceScope()
  const [dealRows, contact] = await Promise.all([
    db
      .select()
      .from(deals)
      .where(and(eq(deals.contactId, contactId), workspaceUserIdMatches(deals.userId, scopeIds)))
      .orderBy(desc(deals.updatedAt)),
    getContactById(contactId),
  ])
  const contactName = contact?.fullName ?? ""
  return dealRows.map((d) => mapDeal(d, contactName))
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { scopeIds } = await getWorkspaceScope()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [contactRows, tagCount, groupCount] = await Promise.all([
    db
      .select({
        lifecycleStage: contacts.lifecycleStage,
        leadScore: contacts.leadScore,
        lastPurchaseAt: contacts.lastPurchaseAt,
        createdAt: contacts.createdAt,
        recommendedNextAction: contacts.recommendedNextAction,
      })
      .from(contacts)
      .where(workspaceUserIdMatches(contacts.userId, scopeIds)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tags)
      .where(workspaceUserIdMatches(tags.userId, scopeIds)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(groups)
      .where(workspaceUserIdMatches(groups.userId, scopeIds)),
  ])

  return {
    totalContacts: contactRows.length,
    newLeads: contactRows.filter(
      (c) => c.lifecycleStage === "New Lead" && c.createdAt && c.createdAt >= sevenDaysAgo,
    ).length,
    needsFollowUp: contactRows.filter((c) => c.recommendedNextAction?.trim()).length,
    hotLeads: contactRows.filter((c) => c.leadScore >= 80).length,
    recentCustomers: contactRows.filter(
      (c) =>
        (c.lifecycleStage === "Customer" || c.lifecycleStage === "Repeat Customer") &&
        c.lastPurchaseAt &&
        c.lastPurchaseAt >= ninetyDaysAgo,
    ).length,
    inactiveCustomers: contactRows.filter((c) => c.lifecycleStage === "Inactive Customer").length,
    tagCount: tagCount[0]?.count ?? 0,
    groupCount: groupCount[0]?.count ?? 0,
  }
}

export async function getWorkspaceBusinessType(workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  return row?.businessType ?? "iv-therapy"
}

export async function searchContactsByProductKeyword(keyword: string, scopeIds: string[]) {
  const pattern = `%${keyword}%`
  return db
    .select()
    .from(contacts)
    .where(
      and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        or(ilike(contacts.productsPurchased, pattern), ilike(contacts.notes, pattern)),
      ),
    )
}

export async function getContactsInGroup(groupId: string) {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select({ contact: contacts })
    .from(contactGroups)
    .innerJoin(contacts, eq(contacts.id, contactGroups.contactId))
    .where(
      and(eq(contactGroups.groupId, groupId), workspaceUserIdMatches(contacts.userId, scopeIds)),
    )
  return rows.map((r) => r.contact)
}

export async function getInactiveCustomers(days = 90) {
  const { scopeIds } = await getWorkspaceScope()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return db
    .select()
    .from(contacts)
    .where(
      and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        or(
          eq(contacts.lifecycleStage, "Inactive Customer"),
          and(
            inArray(contacts.lifecycleStage, ["Customer", "Repeat Customer"]),
            or(sql`${contacts.lastPurchaseAt} IS NULL`, sql`${contacts.lastPurchaseAt} < ${cutoff}`),
          ),
        ),
      ),
    )
}
