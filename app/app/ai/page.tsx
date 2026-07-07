import { AiCommandCenterView } from "./ai-command-center-view"
import { listAiActions } from "@/app/actions/ai"

export const dynamic = "force-dynamic"

export default async function AiCommandCenterPage() {
  const actions = await listAiActions(30)
  const pendingCount = actions.filter((a) => a.status === "pending").length
  return <AiCommandCenterView actions={actions} pendingCount={pendingCount} />
}
