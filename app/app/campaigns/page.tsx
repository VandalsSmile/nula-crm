import { CampaignsView } from "./campaigns-view"
import { getCampaigns } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
  const campaigns = await getCampaigns()
  return <CampaignsView campaigns={campaigns} />
}
