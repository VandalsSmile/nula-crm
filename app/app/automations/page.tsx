import { listAutomations } from "@/app/actions/automations"
import { AutomationsView } from "./automations-view"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Automations",
  "Set up simple CRM automations in Nula — when this happens, do that, with AI-assisted follow-up rules.",
  APP_ROUTES.automations,
)

export default async function AutomationsPage() {
  const automations = await listAutomations()
  return <AutomationsView automations={automations} />
}
