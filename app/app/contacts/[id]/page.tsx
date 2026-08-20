import { notFound } from "next/navigation"
import type { Metadata } from "next"

import {
  getActivitiesForContact,
  getBookingsForContact,
  getContactById,
  getDealsForContact,
  getGroups,
  getTags,
  getTasksForContact,
} from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { contactPath } from "@/lib/routes"
import { ContactProfile } from "./contact-profile"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const contact = await getContactById(id)
  if (!contact) {
    return appPageMetadata("Contact", "Contact profile in Nula CRM.", contactPath(id))
  }
  return appPageMetadata(
    contact.fullName,
    `Contact profile for ${contact.fullName} — lifecycle, tags, deals, and activity timeline in Nula CRM.`,
    contactPath(id),
  )
}

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [contact, activities, deals, tasks, bookings, allTags, allGroups] = await Promise.all([
    getContactById(id),
    getActivitiesForContact(id),
    getDealsForContact(id),
    getTasksForContact(id),
    getBookingsForContact(id),
    getTags(),
    getGroups(),
  ])
  if (!contact) notFound()

  return (
    <ContactProfile
      contact={contact}
      activities={activities}
      deals={deals}
      tasks={tasks}
      bookings={bookings}
      allTags={allTags}
      allGroups={allGroups}
    />
  )
}
