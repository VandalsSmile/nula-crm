import { headers } from "next/headers"

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

  const invite = await lookupTeamInvite(token)
  if (!invite.ok) {
    return <InviteErrorPanel reason={invite.reason} />
  }

  const session = await auth.api.getSession({ headers: await headers() })

  // Route to the right flow:
  //  - signed in as the invited email → one-click accept
  //  - signed in as someone else → prompt to switch accounts
  //  - signed out with an existing account (e.g. a removed teammate) → sign in
  //  - signed out, brand new → sign up
  let mode: "signed-in" | "wrong-account" | "sign-in" | "sign-up"
  if (session?.user) {
    mode =
      session.user.email.toLowerCase() === invite.email.toLowerCase()
        ? "signed-in"
        : "wrong-account"
  } else {
    mode = invite.hasAccount ? "sign-in" : "sign-up"
  }

  return (
    <AcceptInvitePanel
      token={token}
      email={invite.email}
      invitedByName={invite.invitedByName}
      mode={mode}
      signedInEmail={session?.user?.email ?? ""}
    />
  )
}
