import { ClientsView } from "./clients-view"
import { getClients } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const clients = await getClients()
  return <ClientsView clients={clients} />
}
