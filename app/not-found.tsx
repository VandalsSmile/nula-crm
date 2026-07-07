import Link from "next/link"
import { Compass, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Branded 404 shown for unknown routes. */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Compass className="size-7 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
        </div>
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          <Home data-icon="inline-start" />
          Back to dashboard
        </Button>
      </div>
    </main>
  )
}
