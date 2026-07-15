import { CompaniesView } from "./companies-view"
import { getCompanies } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Companies",
  "Organize contacts by the company they belong to — one place per account for your small business.",
  APP_ROUTES.companies,
)

export const dynamic = "force-dynamic"

export default async function CompaniesPage() {
  const companies = await getCompanies()
  return <CompaniesView companies={companies} />
}
