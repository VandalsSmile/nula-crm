import type { Metadata } from "next"

import { resolveUnsubscribeTarget } from "@/lib/unsubscribe"
import { UnsubscribeView } from "./unsubscribe-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const target = await resolveUnsubscribeTarget(token)

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        {!target ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold">Link not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This unsubscribe link is invalid or has expired. If you keep receiving emails, reply to
              any message and ask to be removed.
            </p>
          </div>
        ) : (
          <UnsubscribeView
            token={token}
            email={target.email}
            initiallyOptedOut={target.optedOut}
          />
        )}
      </div>
    </main>
  )
}
