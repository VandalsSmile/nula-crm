import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { LoginPanel } from "@/components/login-panel"
import { safeRedirectPath } from "@/lib/safe-redirect-path"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  const { callbackURL } = await searchParams
  const redirectTo = safeRedirectPath(callbackURL)

  if (session?.user) {
    redirect(redirectTo)
  }
  return <LoginPanel callbackURL={redirectTo} />
}
