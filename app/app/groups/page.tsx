import { GroupsView } from "./groups-view"
import { getGroups } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Groups",
  "Create audience groups for campaigns and automations — intentional segments for your small business outreach.",
  APP_ROUTES.groups,
)

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  const groups = await getGroups()
  return <GroupsView groups={groups} />
}
