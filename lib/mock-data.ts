export type Role = "Admin" | "Content Manager" | "Reviewer" | "Viewer"

export type LacrmConnectionStatus = "Connected" | "Disconnected" | "Failed"

export type LacrmConnection = {
  status: LacrmConnectionStatus
  connectedBy: string
  lastCheckedAt: string
  accountName: string
}

export type Client = {
  id: string
  name: string
  websiteUrl: string
  contactName: string
  contactEmail: string
  phone: string
  location: string
  timezone: string
  industry: string
  accentColor: string
  logoUrl: string | null
  brandVoice: string
  targetAudience: string
  commonServices: string
  notes: string
  lacrm: LacrmConnection
  createdAt: string
}

export type Activity = {
  id: string
  type: string
  message: string
  clientId: string
  clientName: string
  actorName: string
  at: string
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  image: string | null
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
