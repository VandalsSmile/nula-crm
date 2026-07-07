import { GroupsView } from "./groups-view"
import { getGroups } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  const groups = await getGroups()
  return <GroupsView groups={groups} />
}
