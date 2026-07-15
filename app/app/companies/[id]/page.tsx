import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getCompanyById, getContactsForCompany, getLocationsForCompany } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { companyPath } from "@/lib/routes"
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
  const [company, contacts, locations] = await Promise.all([
    getCompanyById(id),
    getContactsForCompany(id),
    getLocationsForCompany(id),
  ])
  if (!company) notFound()

  return <CompanyDetailView company={company} contacts={contacts} locations={locations} />
}
