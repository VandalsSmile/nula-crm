import { listAutomations } from "@/app/actions/automations"
import { AutomationsView } from "./automations-view"

export default async function AutomationsPage() {
  const automations = await listAutomations()
  return <AutomationsView automations={automations} />
}
