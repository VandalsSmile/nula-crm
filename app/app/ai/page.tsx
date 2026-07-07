import { AiCommandCenterView } from "./ai-command-center-view"
import { listAiActions } from "@/app/actions/ai"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "AI Command Center",
  "Review AI-suggested CRM actions in Nula — approve, edit, or undo contact updates, segments, and follow-ups.",
  APP_ROUTES.ai,
)

export const dynamic = "force-dynamic"

export default async function AiCommandCenterPage() {
  const actions = await listAiActions(30)
  const pendingCount = actions.filter((a) => a.status === "pending").length
  return <AiCommandCenterView actions={actions} pendingCount={pendingCount} />
}
