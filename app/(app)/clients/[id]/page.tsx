import { notFound } from "next/navigation"
import { getClientById } from "@/lib/queries"
import { ClientProfile } from "./client-profile"

export const dynamic = "force-dynamic"

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClientById(id)
  if (!client) notFound()
  return <ClientProfile client={client} />
}
