import { CampaignsView } from "./campaigns-view"
import { getCampaigns, getGroups } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
  const [campaigns, groups] = await Promise.all([getCampaigns(), getGroups()])
  return <CampaignsView campaigns={campaigns} groups={groups} />
}
