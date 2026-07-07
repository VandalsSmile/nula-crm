import { getActivities, getClients, getDashboardStats } from "@/lib/queries"
import { DashboardView } from "./dashboard-view"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [clients, activities, stats] = await Promise.all([
    getClients(),
    getActivities(10),
    getDashboardStats(),
  ])

  return <DashboardView clients={clients} activities={activities} stats={stats} />
}
