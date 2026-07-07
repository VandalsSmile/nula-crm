import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"

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
