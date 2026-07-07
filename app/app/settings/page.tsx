import { Suspense } from "react"
import { SettingsView } from "./settings-view"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Settings",
  "Manage your Nula CRM workspace — profile, team invites, security, and account preferences.",
  APP_ROUTES.settings,
)

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  )
}
