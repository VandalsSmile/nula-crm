import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { SignupPanel } from "@/components/signup-panel"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = {
  title: "Sign up — Nula CRM",
  description: "Create your free Nula CRM workspace.",
}

export default async function SignupPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) {
    redirect(APP_ROUTES.dashboard)
  }
  return <SignupPanel />
}
