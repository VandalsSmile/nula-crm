import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Reports",
  "CRM and marketing reports in Nula — leads by source, conversion rates, and campaign performance for small business.",
  APP_ROUTES.reports,
)

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description="Simple marketing and CRM performance." />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Leads by source, conversion rates, and campaign performance — coming soon.
        </CardContent>
      </Card>
    </div>
  )
}
