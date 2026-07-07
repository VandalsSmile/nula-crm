"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_ROUTES } from "@/lib/routes"

/**
 * Route-level error boundary. Catches unhandled runtime errors anywhere in the
 * app and shows a friendly, branded recovery screen instead of a blank page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log("[v0] route error:", error.message, error.digest)
  }, [error])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            An unexpected error occurred. You can try again, and if the problem keeps happening, head
            back to your dashboard.
          </p>
          {error.digest ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
          <Button variant="outline" render={<Link href={APP_ROUTES.dashboard} />} nativeButton={false}>
            <Home data-icon="inline-start" />
            Back to dashboard
          </Button>
        </div>
      </div>
    </main>
  )
}
