import { ReportsView } from "./reports-view"
import { getReportData } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Reports",
  "CRM and marketing reports in Nula — leads by source, conversion rates, and campaign performance for small business.",
  APP_ROUTES.reports,
)

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const data = await getReportData()
  return <ReportsView data={data} />
}
