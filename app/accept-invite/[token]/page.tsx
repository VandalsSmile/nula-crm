import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { lookupTeamInvite } from "@/app/actions/team"
import { AcceptInvitePanel } from "@/components/accept-invite-panel"
import { InviteErrorPanel } from "@/components/invite-error-panel"

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // If someone is already signed in, send them into the app — accepting an
  // invite is for brand-new accounts.
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")

  const invite = await lookupTeamInvite(token)

  if (!invite.ok) {
    return <InviteErrorPanel reason={invite.reason} />
  }

  return (
    <AcceptInvitePanel
      token={token}
      email={invite.email}
      invitedByName={invite.invitedByName}
    />
  )
}
