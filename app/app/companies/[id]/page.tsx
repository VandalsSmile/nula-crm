import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getCompanyById, getContactsForCompany, getLocationsForCompany } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { companyPath } from "@/lib/routes"
import { getWorkspaceId } from "@/lib/auth-helpers"
import { isModuleEnabled, MODULE_IDS } from "@/lib/modules"
import { getEnrichmentView } from "@/app/actions/enrichment"
import { CompanyDetailView } from "./company-detail-view"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const company = await getCompanyById(id)
  if (!company) {
    return appPageMetadata("Company", "Company in Nula CRM.", companyPath(id))
  }
  return appPageMetadata(
    company.name,
    `Contacts and details for ${company.name} in Nula CRM.`,
    companyPath(id),
  )
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workspaceId = await getWorkspaceId()
  const [company, contacts, locations, intelligenceEnabled] = await Promise.all([
    getCompanyById(id),
    getContactsForCompany(id),
    getLocationsForCompany(id),
    isModuleEnabled(workspaceId, MODULE_IDS.b2bIntelligence),
  ])
  if (!company) notFound()

  const enrichment = intelligenceEnabled ? await getEnrichmentView("company", id) : null

  return (
    <CompanyDetailView
      company={company}
      contacts={contacts}
      locations={locations}
      intelligenceEnabled={intelligenceEnabled}
      enrichment={enrichment}
    />
  )
}
