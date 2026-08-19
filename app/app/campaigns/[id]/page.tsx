import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getCampaignById, getGroups } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"
import { CampaignEditor } from "./campaign-editor"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const campaign = await getCampaignById(id)
  const title = campaign ? campaign.name : "Campaign"
  return appPageMetadata(title, "Edit an email campaign in Nula CRM.", `${APP_ROUTES.campaigns}/${id}`)
}

export default async function CampaignEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [campaign, groups] = await Promise.all([getCampaignById(id), getGroups()])
  if (!campaign) notFound()
  return <CampaignEditor campaign={campaign} groups={groups} />
}
