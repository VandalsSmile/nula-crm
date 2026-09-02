import { db } from "@/lib/db"
import {
  activities,
  campaigns,
  companies,
  contactDocuments,
  contactGroups,
  contacts,
  contactTags,
  deals,
  groups,
  bookings,
  locations,
  messages,
  tags,
  tasks,
  workspaceSettings,
} from "@/lib/db/schema"
import { and, desc, eq, ilike, inArray, lte, ne, or, sql } from "drizzle-orm"
import { getWorkspaceScope, workspaceUserIdMatches } from "@/lib/auth-helpers"
import {
  mapActivity,
  mapCampaign,
  mapCompany,
  mapContact,
  mapContactDocument,
  mapDeal,
  mapGroup,
  mapLocation,
  mapTag,
  mapTask,
  mapBooking,
} from "@/lib/mappers"
import type { AiSearchHit, Booking, Company, Contact, ContactDocument, DashboardStats, Deal, InboxConversation, Location, Message, ReportData, Task } from "@/lib/crm-types"
import { contactFullName, LIFECYCLE_STAGES } from "@/lib/crm-types"
import { APP_ROUTES, companyPath, contactPath, groupPath } from "@/lib/routes"
import { getWorkspaceUserLabels, labelForUserId } from "@/lib/workspace-users"

async function contactLabels() {
  const { workspaceId } = await getWorkspaceScope()
  return getWorkspaceUserLabels(workspaceId)
}

/** Map of locationId -> location name for the workspace (for contact display). */
async function locationLabels(scopeIds: string[]): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(workspaceUserIdMatches(locations.userId, scopeIds))
  return new Map(rows.map((r) => [r.id, r.name]))
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

export async function getContacts(search?: string, companyId?: string): Promise<Contact[]> {
  const { scopeIds } = await getWorkspaceScope()
  const conditions = [workspaceUserIdMatches(contacts.userId, scopeIds)]
  if (search?.trim()) {
    conditions.push(
      or(
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.name, `%${search}%`),
        ilike(contacts.companyName, `%${search}%`),
      )!,
    )
  }
  if (companyId?.trim()) {
    conditions.push(eq(contacts.companyId, companyId))
  }
  const where = and(...conditions)

  const rows = await db.select().from(contacts).where(where).orderBy(desc(contacts.createdAt))
  const [{ tagMap, groupMap }, labels, locMap] = await Promise.all([
    loadContactRelations(
      rows.map((r) => r.id),
      scopeIds,
    ),
    contactLabels(),
    locationLabels(scopeIds),
  ])

  return rows.map((row) =>
    mapContact(row, {
      tags: tagMap.get(row.id) ?? [],
      groups: groupMap.get(row.id) ?? [],
      ownerName: row.ownerId ? labelForUserId(labels, row.ownerId) : "",
      locationName: row.locationId ? locMap.get(row.locationId) ?? "" : "",
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

  const [{ tagMap, groupMap }, labels, locMap] = await Promise.all([
    loadContactRelations([id], scopeIds),
    contactLabels(),
    locationLabels(scopeIds),
  ])
  return mapContact(row, {
    tags: tagMap.get(id) ?? [],
    groups: groupMap.get(id) ?? [],
    ownerName: row.ownerId ? labelForUserId(labels, row.ownerId) : "",
    locationName: row.locationId ? locMap.get(row.locationId) ?? "" : "",
  })
}

export async function getCompanies(): Promise<Company[]> {
  const { scopeIds } = await getWorkspaceScope()
  const [companyRows, counts] = await Promise.all([
    db
      .select()
      .from(companies)
      .where(workspaceUserIdMatches(companies.userId, scopeIds))
      .orderBy(companies.name),
    db
      .select({ companyId: contacts.companyId, count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(workspaceUserIdMatches(contacts.userId, scopeIds))
      .groupBy(contacts.companyId),
  ])

  const countMap = new Map(counts.map((r) => [r.companyId, r.count]))
  return companyRows.map((c) => mapCompany(c, countMap.get(c.id) ?? 0))
}

/** Contacts that have a free-text company name but aren't linked to a company record. */
export async function countUnlinkedCompanyContacts(): Promise<number> {
  const { scopeIds } = await getWorkspaceScope()
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(
      and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        eq(contacts.companyId, ""),
        ne(contacts.companyName, ""),
      ),
    )
  return row?.count ?? 0
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const { scopeIds } = await getWorkspaceScope()
  const [row] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), workspaceUserIdMatches(companies.userId, scopeIds)))
    .limit(1)
  if (!row) return null

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.companyId, id), workspaceUserIdMatches(contacts.userId, scopeIds)))

  return mapCompany(row, countRow?.count ?? 0)
}

export async function getLocationsForCompany(companyId: string): Promise<Location[]> {
  const { scopeIds } = await getWorkspaceScope()
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(locations)
      .where(and(eq(locations.companyId, companyId), workspaceUserIdMatches(locations.userId, scopeIds)))
      .orderBy(locations.name),
    db
      .select({ locationId: contacts.locationId, count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(and(eq(contacts.companyId, companyId), workspaceUserIdMatches(contacts.userId, scopeIds)))
      .groupBy(contacts.locationId),
  ])
  const countMap = new Map(counts.map((r) => [r.locationId, r.count]))
  return rows.map((r) => mapLocation(r, countMap.get(r.id) ?? 0))
}

export async function getContactsForCompany(companyId: string): Promise<Contact[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .orderBy(desc(contacts.createdAt))

  const [{ tagMap, groupMap }, labels, locMap] = await Promise.all([
    loadContactRelations(
      rows.map((r) => r.id),
      scopeIds,
    ),
    contactLabels(),
    locationLabels(scopeIds),
  ])

  return rows.map((row) =>
    mapContact(row, {
      tags: tagMap.get(row.id) ?? [],
      groups: groupMap.get(row.id) ?? [],
      ownerName: row.ownerId ? labelForUserId(labels, row.ownerId) : "",
      locationName: row.locationId ? locMap.get(row.locationId) ?? "" : "",
    }),
  )
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

export async function getCampaignById(id: string) {
  const { scopeIds } = await getWorkspaceScope()
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), workspaceUserIdMatches(campaigns.userId, scopeIds)))
    .limit(1)
  return row ? mapCampaign(row) : null
}

export async function getActivities(limit = 20) {
  const { scopeIds } = await getWorkspaceScope()
  const [rows, contactRows, labels] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(workspaceUserIdMatches(activities.userId, scopeIds))
      .orderBy(desc(activities.at))
      .limit(limit),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        name: contacts.name,
        companyId: contacts.companyId,
        companyName: contacts.companyName,
      })
      .from(contacts)
      .where(workspaceUserIdMatches(contacts.userId, scopeIds)),
    contactLabels(),
  ])

  const info = new Map(
    contactRows.map((c) => [
      c.id,
      {
        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || c.companyName,
        companyId: c.companyId,
        companyName: c.companyName,
      },
    ]),
  )
  return rows.map((row) => {
    const c = info.get(row.contactId)
    return mapActivity(row, labels, c?.name ?? "", {
      companyId: c?.companyId,
      companyName: c?.companyName,
    })
  })
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

export async function getDeals(): Promise<Deal[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select({ deal: deals, contact: contacts })
    .from(deals)
    .innerJoin(contacts, eq(contacts.id, deals.contactId))
    .where(workspaceUserIdMatches(deals.userId, scopeIds))
    .orderBy(desc(deals.updatedAt))
  return rows.map(({ deal, contact }) =>
    mapDeal(deal, [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name),
  )
}

function contactDisplayName(contact: { firstName: string; lastName: string; name: string } | null): string {
  if (!contact) return ""
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name
}

const TASK_ORDER = [
  sql`case when ${tasks.status}='open' then 0 else 1 end`,
  sql`${tasks.dueAt} asc nulls last`,
  desc(tasks.createdAt),
]

export async function getTasks(): Promise<Task[]> {
  const { workspaceId, scopeIds } = await getWorkspaceScope()
  const users = await getWorkspaceUserLabels(workspaceId)
  const rows = await db
    .select({ task: tasks, contact: contacts })
    .from(tasks)
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .where(workspaceUserIdMatches(tasks.userId, scopeIds))
    .orderBy(...TASK_ORDER)
  return rows.map(({ task, contact }) =>
    mapTask(task, { contactName: contactDisplayName(contact), users }),
  )
}

export async function getTasksForContact(contactId: string): Promise<Task[]> {
  const { workspaceId, scopeIds } = await getWorkspaceScope()
  const users = await getWorkspaceUserLabels(workspaceId)
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.contactId, contactId), workspaceUserIdMatches(tasks.userId, scopeIds)))
    .orderBy(...TASK_ORDER)
  return rows.map((t) => mapTask(t, { users }))
}

export type TaskStats = { open: number; overdue: number; dueToday: number }

export async function getTaskStats(): Promise<TaskStats> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select({ status: tasks.status, dueAt: tasks.dueAt })
    .from(tasks)
    .where(workspaceUserIdMatches(tasks.userId, scopeIds))
  const now = new Date()
  const endToday = new Date(now)
  endToday.setHours(23, 59, 59, 999)
  const stats: TaskStats = { open: 0, overdue: 0, dueToday: 0 }
  for (const r of rows) {
    if (r.status !== "open") continue
    stats.open++
    if (r.dueAt) {
      if (r.dueAt < now) stats.overdue++
      else if (r.dueAt <= endToday) stats.dueToday++
    }
  }
  return stats
}

/** Open tasks that are overdue or due today — for the dashboard alert. */
export async function getDueTasks(limit = 6): Promise<Task[]> {
  const { workspaceId, scopeIds } = await getWorkspaceScope()
  const users = await getWorkspaceUserLabels(workspaceId)
  const endToday = new Date()
  endToday.setHours(23, 59, 59, 999)
  const rows = await db
    .select({ task: tasks, contact: contacts })
    .from(tasks)
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .where(
      and(
        workspaceUserIdMatches(tasks.userId, scopeIds),
        eq(tasks.status, "open"),
        lte(tasks.dueAt, endToday),
      ),
    )
    .orderBy(sql`${tasks.dueAt} asc nulls last`)
    .limit(limit)
  return rows.map(({ task, contact }) =>
    mapTask(task, { contactName: contactDisplayName(contact), users }),
  )
}

export async function getBookings(): Promise<Booking[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select({ booking: bookings, contact: contacts })
    .from(bookings)
    .leftJoin(contacts, eq(contacts.id, bookings.contactId))
    .where(workspaceUserIdMatches(bookings.userId, scopeIds))
    .orderBy(sql`${bookings.startAt} asc nulls last`)
  return rows.map(({ booking, contact }) => mapBooking(booking, contactDisplayName(contact)))
}

export async function getBookingsForContact(contactId: string): Promise<Booking[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.contactId, contactId), workspaceUserIdMatches(bookings.userId, scopeIds)))
    .orderBy(desc(bookings.startAt))
  return rows.map((b) => mapBooking(b))
}

export async function getReportData(): Promise<ReportData> {
  const { scopeIds } = await getWorkspaceScope()

  const [contactRows, campaignRows] = await Promise.all([
    db
      .select({ lifecycleStage: contacts.lifecycleStage, source: contacts.source })
      .from(contacts)
      .where(workspaceUserIdMatches(contacts.userId, scopeIds)),
    db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(workspaceUserIdMatches(campaigns.userId, scopeIds)),
  ])

  const totalContacts = contactRows.length

  const sourceMap = new Map<string, number>()
  for (const c of contactRows) {
    const source = c.source?.trim() || "Unknown"
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1)
  }
  const leadsBySource = [...sourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  const stageMap = new Map<string, number>()
  for (const c of contactRows) {
    stageMap.set(c.lifecycleStage, (stageMap.get(c.lifecycleStage) ?? 0) + 1)
  }
  const lifecycleFunnel = LIFECYCLE_STAGES.map((stage) => ({ stage, count: stageMap.get(stage) ?? 0 }))

  const customers = contactRows.filter(
    (c) => c.lifecycleStage === "Customer" || c.lifecycleStage === "Repeat Customer",
  ).length
  const conversionRate = totalContacts > 0 ? Math.round((customers / totalContacts) * 100) : 0

  const statusMap = new Map<string, number>()
  for (const c of campaignRows) {
    statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1)
  }
  const campaignsByStatus = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalContacts,
    customers,
    conversionRate,
    totalCampaigns: campaignRows.length,
    leadsBySource,
    lifecycleFunnel,
    campaignsByStatus,
  }
}

export async function getInboxConversations(): Promise<InboxConversation[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select({ msg: messages, contact: contacts })
    .from(messages)
    .innerJoin(contacts, eq(contacts.id, messages.contactId))
    .where(workspaceUserIdMatches(messages.userId, scopeIds))
    .orderBy(desc(messages.createdAt))

  const byContact = new Map<string, InboxConversation>()
  for (const { msg, contact } of rows) {
    const existing = byContact.get(contact.id)
    if (existing) {
      existing.messageCount++
      continue
    }
    byContact.set(contact.id, {
      contactId: contact.id,
      contactName:
        contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed contact",
      contactEmail: contact.email,
      lastMessage: msg.body,
      lastDirection: msg.direction,
      lastChannel: msg.channel,
      lastAt: msg.createdAt.toISOString(),
      messageCount: 1,
      unread:
        msg.direction === "inbound" && (msg.status === "received" || msg.status === "logged"),
    })
  }
  return [...byContact.values()]
}

export async function getMessagesForContact(contactId: string): Promise<Message[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select()
    .from(messages)
    .where(and(workspaceUserIdMatches(messages.userId, scopeIds), eq(messages.contactId, contactId)))
    .orderBy(messages.createdAt)
  return rows.map((m) => ({
    id: m.id,
    contactId: m.contactId,
    direction: m.direction,
    channel: m.channel,
    subject: m.subject,
    body: m.body,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }))
}

export async function getDocumentsForContact(contactId: string): Promise<ContactDocument[]> {
  const { workspaceId, scopeIds } = await getWorkspaceScope()
  const [rows, users] = await Promise.all([
    db
      .select()
      .from(contactDocuments)
      .where(
        and(
          eq(contactDocuments.contactId, contactId),
          workspaceUserIdMatches(contactDocuments.userId, scopeIds),
        ),
      )
      .orderBy(desc(contactDocuments.createdAt)),
    getWorkspaceUserLabels(workspaceId),
  ])
  return rows.map((d) => mapContactDocument(d, users))
}

/**
 * Lightweight cross-entity text search used by the AI command bar to return
 * clickable links to matching records (contacts, companies, deals, groups, tags).
 * Workspace-scoped; each category is capped so the dropdown stays snappy.
 */
export async function searchWorkspace(query: string): Promise<AiSearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const { scopeIds } = await getWorkspaceScope()
  const pattern = `%${q}%`

  const [contactRows, companyRows, dealRows, groupRows, tagRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        name: contacts.name,
        email: contacts.email,
        companyName: contacts.companyName,
      })
      .from(contacts)
      .where(
        and(
          workspaceUserIdMatches(contacts.userId, scopeIds),
          or(
            ilike(contacts.firstName, pattern),
            ilike(contacts.lastName, pattern),
            ilike(contacts.name, pattern),
            ilike(contacts.email, pattern),
            ilike(contacts.phone, pattern),
            ilike(contacts.companyName, pattern),
          )!,
        ),
      )
      .orderBy(desc(contacts.lastActivityAt))
      .limit(6),
    db
      .select({ id: companies.id, name: companies.name, city: companies.city, state: companies.state })
      .from(companies)
      .where(
        and(
          workspaceUserIdMatches(companies.userId, scopeIds),
          or(ilike(companies.name, pattern), ilike(companies.website, pattern), ilike(companies.city, pattern))!,
        ),
      )
      .orderBy(companies.name)
      .limit(5),
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        contactId: deals.contactId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        contactName: contacts.name,
      })
      .from(deals)
      .leftJoin(contacts, eq(contacts.id, deals.contactId))
      .where(
        and(
          workspaceUserIdMatches(deals.userId, scopeIds),
          or(ilike(deals.title, pattern), ilike(deals.offerInterest, pattern))!,
        ),
      )
      .orderBy(desc(deals.updatedAt))
      .limit(5),
    db
      .select({ id: groups.id, name: groups.name, description: groups.description })
      .from(groups)
      .where(and(workspaceUserIdMatches(groups.userId, scopeIds), ilike(groups.name, pattern)))
      .orderBy(groups.name)
      .limit(4),
    db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(and(workspaceUserIdMatches(tags.userId, scopeIds), ilike(tags.name, pattern)))
      .orderBy(tags.name)
      .limit(4),
  ])

  const hits: AiSearchHit[] = []

  for (const c of contactRows) {
    const label = contactFullName(c.firstName, c.lastName) || c.name || c.email || "Unnamed contact"
    hits.push({
      type: "contact",
      id: c.id,
      label,
      subtitle: [c.companyName, c.email].filter(Boolean).join(" · ") || "Contact",
      href: contactPath(c.id),
    })
  }
  for (const co of companyRows) {
    hits.push({
      type: "company",
      id: co.id,
      label: co.name || "Unnamed company",
      subtitle: [co.city, co.state].filter(Boolean).join(", ") || "Company",
      href: companyPath(co.id),
    })
  }
  for (const d of dealRows) {
    const who = contactFullName(d.firstName ?? "", d.lastName ?? "") || d.contactName || ""
    hits.push({
      type: "deal",
      id: d.id,
      label: d.title || "Untitled deal",
      subtitle: [`Deal · ${d.stage}`, who].filter(Boolean).join(" · "),
      href: d.contactId ? contactPath(d.contactId) : APP_ROUTES.deals,
    })
  }
  for (const g of groupRows) {
    hits.push({
      type: "group",
      id: g.id,
      label: g.name,
      subtitle: g.description?.trim() || "Group",
      href: groupPath(g.id),
    })
  }
  for (const t of tagRows) {
    hits.push({ type: "tag", id: t.id, label: t.name, subtitle: "Tag", href: APP_ROUTES.tags })
  }

  return hits
}

export async function getWorkspaceBusinessType(workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  return row?.businessType ?? "general"
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
