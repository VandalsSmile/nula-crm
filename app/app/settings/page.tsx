import { Suspense } from "react"
import { SettingsView } from "./settings-view"

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  )
}
