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
