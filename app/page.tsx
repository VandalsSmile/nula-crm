import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LAST_ROUTE_COOKIE, safeRedirectPath } from "@/lib/safe-redirect-path"

export default async function Home() {
  const cookieStore = await cookies()
  const lastRoute = cookieStore.get(LAST_ROUTE_COOKIE)?.value
  redirect(safeRedirectPath(lastRoute ? decodeURIComponent(lastRoute) : null))
}
