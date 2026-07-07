import { ContactsView } from "./contacts-view"
import { getContacts } from "@/lib/queries"

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
