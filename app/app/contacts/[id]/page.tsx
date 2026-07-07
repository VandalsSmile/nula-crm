import { notFound } from "next/navigation"
import { getActivities, getContactById } from "@/lib/queries"
import { ContactProfile } from "./contact-profile"

export const dynamic = "force-dynamic"

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [contact, activities] = await Promise.all([getContactById(id), getActivities(30)])
  if (!contact) notFound()
  const timeline = activities.filter((a) => a.contactId === id || !a.contactId)
  return <ContactProfile contact={contact} activities={timeline} />
}
