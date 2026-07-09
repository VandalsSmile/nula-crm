import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AiCommandBar } from "@/components/ai-command-bar"
import { LastRouteTracker } from "@/components/last-route-tracker"
import { TopBar } from "@/components/top-bar"
import { TrialBanner } from "@/components/trial-banner"
import { SessionUserProvider } from "@/lib/session-context"
import { safeRedirectPath } from "@/lib/routes"
import { appPrivateMetadata } from "@/lib/seo"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getUserProfile, resolveActingWorkspaceId } from "@/lib/auth-helpers"
import { getTrialStatus } from "@/app/actions/workspace"
import { isSuperAdminEmail } from "@/lib/superadmin"
import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"

export const metadata = appPrivateMetadata

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    const headersList = await headers()
    const callbackURL = safeRedirectPath(headersList.get("x-nula-path"))
    redirect(`/login?callbackURL=${encodeURIComponent(callbackURL)}`)
  }

  // Block access to suspended accounts (super-admins manage via /dashboard).
  const workspaceId = await resolveActingWorkspaceId(session.user.id)
  const [ws] = await db
    .select({ suspended: workspaceSettings.suspended })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (ws?.suspended) redirect("/suspended")

  const profile = await getUserProfile(session.user.id)
  const trial = await getTrialStatus()
  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: profile.role,
    phone: profile.phone,
    jobTitle: profile.jobTitle,
    image: session.user.image ?? null,
    isSuperAdmin: isSuperAdminEmail(session.user.email),
  }

  return (
    <SessionUserProvider user={user}>
      <SidebarProvider>
        <LastRouteTracker />
        <AppSidebar />
        <SidebarInset>
          <TrialBanner status={trial} />
          <TopBar />
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <AiCommandBar />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionUserProvider>
  )
}
