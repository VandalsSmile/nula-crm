import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { APP_ROUTES } from "@/lib/routes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const COPY: Record<string, { title: string; description: string }> = {
  not_found: {
    title: "Invite not found",
    description: "This invite link is invalid. Double-check the link or ask an admin to send a new one.",
  },
  revoked: {
    title: "Invite revoked",
    description: "This invite has been revoked by an admin. Ask them to send you a new link.",
  },
  accepted: {
    title: "Invite already used",
    description: "This invite has already been accepted. Try signing in instead.",
  },
  expired: {
    title: "Invite expired",
    description: "This invite link has expired. Ask an admin to send you a fresh one.",
  },
}

export function InviteErrorPanel({ reason }: { reason: string }) {
  const copy = COPY[reason] ?? COPY.not_found

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-2 size-11" />
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" render={<Link href={APP_ROUTES.login} />}>
            Go to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
