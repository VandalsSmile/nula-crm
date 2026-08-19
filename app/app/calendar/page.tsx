import { CalendarView } from "./calendar-view"
import { getTasks } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Calendar",
  "See your tasks and follow-ups on a monthly calendar in Nula CRM.",
  APP_ROUTES.calendar,
)

export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const tasks = await getTasks()
  return <CalendarView tasks={tasks} />
}
