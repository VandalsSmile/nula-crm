import { Suspense } from "react"

import { ResetPasswordPanel } from "@/components/reset-password-panel"

export const metadata = {
  title: "Choose a new password — Nula CRM",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPanel />
    </Suspense>
  )
}
