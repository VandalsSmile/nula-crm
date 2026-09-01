"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { APP_ROUTES } from "@/lib/routes"
import { useCanWrite } from "@/lib/session-context"
import { TRIAL_ENDED_MESSAGE } from "@/lib/trial"

/**
 * Returns a guard to call before a write action. When the workspace can't write
 * (ended trial, no paid plan) it shows a clear upgrade toast and returns false,
 * so the caller can bail out instead of hitting the server and getting the
 * generic, redacted "Server Components render" error that production returns for
 * thrown server-action messages.
 */
export function useWriteGuard(): () => boolean {
  const canWrite = useCanWrite()
  const router = useRouter()
  return () => {
    if (canWrite) return true
    toast.error(TRIAL_ENDED_MESSAGE, {
      action: {
        label: "Upgrade",
        onClick: () => router.push(`${APP_ROUTES.settings}?tab=plan`),
      },
    })
    return false
  }
}
