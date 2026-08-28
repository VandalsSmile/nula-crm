import { notFound } from "next/navigation"
import type { Metadata } from "next"

import {
  getActivitiesForContact,
  getBookingsForContact,
  getContactById,
  getDealsForContact,
  getGroups,
  getMessagesForContact,
  getTags,
  getTasksForContact,
} from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { contactPath } from "@/lib/routes"
import { getWorkspaceId } from "@/lib/auth-helpers"
import { isModuleEnabled, MODULE_IDS } from "@/lib/modules"
import { getEnrichmentView } from "@/app/actions/enrichment"
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

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ email?: string }>
}) {
  const { id } = await params
  const { email: initialEmailId } = await searchParams
  const workspaceId = await getWorkspaceId()
  const [contact, activities, deals, tasks, bookings, messages, allTags, allGroups, intelligenceEnabled] =
    await Promise.all([
      getContactById(id),
      getActivitiesForContact(id),
      getDealsForContact(id),
      getTasksForContact(id),
      getBookingsForContact(id),
      getMessagesForContact(id),
      getTags(),
      getGroups(),
      isModuleEnabled(workspaceId, MODULE_IDS.b2bIntelligence),
    ])
  if (!contact) notFound()

  const enrichment = intelligenceEnabled ? await getEnrichmentView("contact", id) : null
  // Most-recent-first email history for the contact record.
  const emails = messages.filter((m) => m.channel === "email").reverse()

  return (
    <ContactProfile
      contact={contact}
      activities={activities}
      deals={deals}
      tasks={tasks}
      bookings={bookings}
      emails={emails}
      allTags={allTags}
      allGroups={allGroups}
      intelligenceEnabled={intelligenceEnabled}
      enrichment={enrichment}
      initialEmailId={initialEmailId ?? ""}
    />
  )
}
