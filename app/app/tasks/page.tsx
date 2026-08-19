import { TasksView } from "./tasks-view"
import { getTasks } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Tasks",
  "Track follow-ups and to-dos in Nula CRM — due dates, priorities, and reminders, linked to your contacts.",
  APP_ROUTES.tasks,
)

export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const tasks = await getTasks()
  return <TasksView tasks={tasks} />
}
