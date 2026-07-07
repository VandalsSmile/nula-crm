import { CampaignsView } from "./campaigns-view"
import { getCampaigns, getGroups } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Campaigns",
  "Draft and send email campaigns from Nula CRM — reactivation, nurture, and AI-assisted outreach for small business.",
  APP_ROUTES.campaigns,
)

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
  const [campaigns, groups] = await Promise.all([getCampaigns(), getGroups()])
  return <CampaignsView campaigns={campaigns} groups={groups} />
}
