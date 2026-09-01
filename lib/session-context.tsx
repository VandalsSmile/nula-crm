"use client"

import { createContext, useContext } from "react"

import type { WorkspaceRole } from "@/lib/roles"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: WorkspaceRole
  phone: string
  jobTitle: string
  image: string | null
  isSuperAdmin: boolean
  /** Whether the workspace may make changes (paid/comped/active trial). */
  canWrite: boolean
}

const SessionUserContext = createContext<SessionUser | null>(null)

export function SessionUserProvider({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  return <SessionUserContext.Provider value={user}>{children}</SessionUserContext.Provider>
}

export function useSessionUser(): SessionUser {
  const ctx = useContext(SessionUserContext)
  if (!ctx) {
    throw new Error("useSessionUser must be used within a SessionUserProvider")
  }
  return ctx
}

/**
 * Whether the current workspace can make changes. Use this to gate write UIs so
 * a locked-out (ended-trial) workspace gets a clear upgrade prompt instead of a
 * cryptic server error — Next.js redacts thrown server-action messages in prod.
 */
export function useCanWrite(): boolean {
  return useSessionUser().canWrite
}
