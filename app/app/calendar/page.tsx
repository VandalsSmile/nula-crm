import { CalendarView } from "./calendar-view"
import { getBookings, getTasks } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Calendar",
  "See your tasks, follow-ups, and booked appointments on a monthly calendar in Nula CRM.",
  APP_ROUTES.calendar,
)

export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const [tasks, bookings] = await Promise.all([getTasks(), getBookings()])
  return <CalendarView tasks={tasks} bookings={bookings} />
}
