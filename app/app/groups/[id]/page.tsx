import { notFound } from "next/navigation"

import { getContacts, getContactsInGroup, getGroupById } from "@/lib/queries"
import { GroupDetailView } from "./group-detail-view"

export const dynamic = "force-dynamic"

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
