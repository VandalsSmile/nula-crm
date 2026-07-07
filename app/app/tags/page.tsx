import { TagsView } from "./tags-view"
import { getTags } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Tags",
  "Organize contacts with tags in Nula CRM — source, status, interests, and custom labels that stay tidy.",
  APP_ROUTES.tags,
)

export const dynamic = "force-dynamic"

export default async function TagsPage() {
  const tags = await getTags()
  return <TagsView tags={tags} />
}
