import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LastRouteTracker } from "@/components/last-route-tracker"
import { TopBar } from "@/components/top-bar"
import { SessionUserProvider } from "@/lib/session-context"
import { safeRedirectPath } from "@/lib/safe-redirect-path"
import { auth } from "@/lib/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    const headersList = await headers()
    const callbackURL = safeRedirectPath(headersList.get("x-nula-path"))
    redirect(`/login?callbackURL=${encodeURIComponent(callbackURL)}`)
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: "Admin" as const,
    image: session.user.image ?? null,
  }

  return (
    <SessionUserProvider user={user}>
      <SidebarProvider>
        <LastRouteTracker />
        <AppSidebar />
        <SidebarInset>
          <TopBar />
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SessionUserProvider>
  )
}
