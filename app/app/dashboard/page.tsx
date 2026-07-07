import { DashboardView } from "./dashboard-view"
import { seedWorkspaceDefaults } from "@/app/actions/workspace"
import { getActivities, getContacts, getDashboardStats } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Dashboard",
  "Your weekly CRM overview — new leads, follow-ups due, and recommended AI actions for your small business.",
  APP_ROUTES.dashboard,
)

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
