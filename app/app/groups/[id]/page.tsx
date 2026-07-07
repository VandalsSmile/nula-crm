import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getContacts, getContactsInGroup, getGroupById } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { groupPath } from "@/lib/routes"
import { GroupDetailView } from "./group-detail-view"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const group = await getGroupById(id)
  if (!group) {
    return appPageMetadata("Group", "Audience group in Nula CRM.", groupPath(id))
  }
  return appPageMetadata(
    group.name,
    group.description || `Audience group "${group.name}" for campaigns and automations in Nula CRM.`,
    groupPath(id),
  )
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [group, allContacts, memberRows] = await Promise.all([
    getGroupById(id),
    getContacts(),
    getContactsInGroup(id),
  ])
  if (!group) notFound()

  const memberIds = new Set(memberRows.map((r) => r.id))
  const members = allContacts.filter((c) => memberIds.has(c.id))

  return <GroupDetailView group={group} members={members} allContacts={allContacts} />
}
