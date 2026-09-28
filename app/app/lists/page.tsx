import { TargetListsView } from "./target-lists-view"
import { getTargetLists } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Target lists",
  "Build and work target lists for outbound outreach — track per-contact status and progress across your sales team.",
  APP_ROUTES.lists,
)

export const dynamic = "force-dynamic"

export default async function ListsPage() {
  const lists = await getTargetLists()
  return <TargetListsView lists={lists} />
}
