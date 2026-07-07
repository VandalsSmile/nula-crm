import { DashboardView } from "./dashboard-view"
import { seedWorkspaceDefaults } from "@/app/actions/workspace"
import { getActivities, getContacts, getDashboardStats } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  await seedWorkspaceDefaults("iv-therapy")

  const [contacts, activities, stats] = await Promise.all([
    getContacts(),
    getActivities(10),
    getDashboardStats(),
  ])

  return <DashboardView contacts={contacts} activities={activities} stats={stats} />
}
