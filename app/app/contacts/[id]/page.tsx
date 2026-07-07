import { notFound } from "next/navigation"

import {
  getActivitiesForContact,
  getContactById,
  getDealsForContact,
  getGroups,
  getTags,
} from "@/lib/queries"
import { ContactProfile } from "./contact-profile"

export const dynamic = "force-dynamic"

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [contact, activities, deals, allTags, allGroups] = await Promise.all([
    getContactById(id),
    getActivitiesForContact(id),
    getDealsForContact(id),
    getTags(),
    getGroups(),
  ])
  if (!contact) notFound()

  return (
    <ContactProfile
      contact={contact}
      activities={activities}
      deals={deals}
      allTags={allTags}
      allGroups={allGroups}
    />
  )
}
