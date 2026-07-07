import { ContactsView } from "./contacts-view"
import { getContacts } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Contacts",
  "Manage leads and customers in Nula CRM — view lifecycle stage, lead score, tags, and follow-up history.",
  APP_ROUTES.contacts,
)

export const dynamic = "force-dynamic"

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const contacts = await getContacts(q)
  return <ContactsView contacts={contacts} />
}
