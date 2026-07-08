import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = {
  title: "Welcome — Nula CRM",
  description: "Set up your Nula CRM workspace.",
}

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect(APP_ROUTES.login)
  }
  return <OnboardingWizard initialName={session.user.name ?? ""} />
}
