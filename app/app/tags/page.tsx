import { TagsView } from "./tags-view"
import { getTags } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function TagsPage() {
  const tags = await getTags()
  return <TagsView tags={tags} />
}
