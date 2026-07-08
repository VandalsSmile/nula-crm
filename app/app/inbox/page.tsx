import { InboxView } from "./inbox-view"
import { getInboxConversations } from "@/lib/queries"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Inbox",
  "Unified customer conversations in Nula CRM — email and SMS replies in one inbox for your team.",
  APP_ROUTES.inbox,
)

export const dynamic = "force-dynamic"

export default async function InboxPage() {
  const conversations = await getInboxConversations()
  return <InboxView conversations={conversations} />
}
