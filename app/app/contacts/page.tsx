import { ContactsView } from "./contacts-view"
import { getCompanies, getContacts, getGroups, getTargetLists } from "@/lib/queries"
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
  searchParams: Promise<{ q?: string; company?: string }>
}) {
  const { q, company } = await searchParams
  const [contacts, companies, groups, targetLists] = await Promise.all([
    getContacts(q, company),
    getCompanies(),
    getGroups(),
    getTargetLists(),
  ])
  return (
    <ContactsView
      contacts={contacts}
      companies={companies}
      groups={groups}
      targetLists={targetLists}
      selectedCompanyId={company ?? ""}
    />
  )
}
