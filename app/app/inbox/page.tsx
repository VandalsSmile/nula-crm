import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Inbox",
  "Unified customer conversations in Nula CRM — email and SMS replies in one inbox for your team.",
  APP_ROUTES.inbox,
)

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inbox" description="Unified conversations — coming in Phase 4." />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Inbox will consolidate email and SMS replies in one place.
        </CardContent>
      </Card>
    </div>
  )
}
