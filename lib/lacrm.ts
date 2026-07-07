import "server-only"

const LACRM_API_URL = "https://api.lessannoyingcrm.com/v2/"

type LacrmErrorBody = {
  ErrorCode?: number
  ErrorDescription?: string
}

export type LacrmUser = {
  UserId: string
  FirstName?: string
  LastName?: string
  Email?: string
  CompanyName?: string
}

export type LacrmGroup = {
  GroupId: string
  Name: string
  NumberOfContacts?: number
}

export type LacrmContact = {
  ContactId: string
  Name?: string | Record<string, unknown>
  Email?: unknown
}

export type LacrmGroupRecipient = {
  contactId: string
  name: string
  email: string
}

export class LacrmApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
    this.name = "LacrmApiError"
  }
}

export async function callLacrm<T>(
  apiKey: string,
  fn: string,
  parameters: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(LACRM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey.trim(),
    },
    body: JSON.stringify({
      Function: fn,
      Parameters: parameters,
    }),
    cache: "no-store",
  })

  let body: (T & LacrmErrorBody) | LacrmErrorBody
  try {
    body = (await response.json()) as T & LacrmErrorBody
  } catch {
    throw new LacrmApiError(`LACRM returned an unreadable response (${response.status}).`)
  }

  if (!response.ok || body.ErrorCode) {
    const description =
      body.ErrorDescription?.trim() ||
      `LACRM API call failed (${response.status || body.ErrorCode || "unknown"}).`
    throw new LacrmApiError(description, body.ErrorCode)
  }

  return body as T
}

export function formatLacrmAccountName(user: LacrmUser): string {
  const name = [user.FirstName, user.LastName].filter(Boolean).join(" ").trim()
  if (name && user.CompanyName?.trim()) {
    return `${name} · ${user.CompanyName.trim()}`
  }
  return name || user.CompanyName?.trim() || user.Email?.trim() || "LACRM account"
}

export async function verifyLacrmApiKey(apiKey: string): Promise<LacrmUser> {
  return callLacrm<LacrmUser>(apiKey, "GetUser")
}

export async function listLacrmGroups(apiKey: string): Promise<LacrmGroup[]> {
  const result = await callLacrm<{ Results?: LacrmGroup[] } | LacrmGroup[]>(apiKey, "GetGroups", {
    IncludeContactCounts: true,
  })
  if (Array.isArray(result)) return result
  return result.Results ?? []
}

export async function listLacrmGroupContacts(
  apiKey: string,
  groupId: string,
): Promise<LacrmContact[]> {
  const contacts: LacrmContact[] = []
  let page = 1
  let hasMore = true

  // GetContactsInGroup only returns membership metadata (no Email). Fetch full contacts
  // in the group via GetContacts so deliverable addresses are available for sends.
  while (hasMore && page <= 20) {
    const result = await callLacrm<{
      HasMoreResults?: boolean
      Results?: LacrmContact[]
    }>(apiKey, "GetContacts", {
      AdvancedFilters: [{ Name: "Group", Operation: "IsInGroupList", Value: [groupId] }],
      RecordTypeFilter: "Contacts",
      MaxNumberOfResults: 500,
      Page: page,
    })

    const batch = result.Results ?? []
    contacts.push(...batch)
    hasMore = result.HasMoreResults === true
    page += 1
  }

  return contacts
}

/** Format LACRM contact names returned as strings or structured name objects. */
export function formatLacrmContactName(name: unknown): string {
  if (typeof name === "string") return name.trim()
  if (!name || typeof name !== "object") return ""

  const record = name as Record<string, unknown>
  if (typeof record.FullName === "string" && record.FullName.trim()) {
    return record.FullName.trim()
  }

  const parts = [record.Salutation, record.FirstName, record.MiddleName, record.LastName, record.Suffix]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim())

  return parts.join(" ")
}

/** Normalize LACRM's flexible Email field into a single deliverable address. */
export function extractContactEmail(emailField: unknown): string | null {
  if (!emailField) return null

  if (typeof emailField === "string") {
    const trimmed = emailField.trim()
    return trimmed.includes("@") ? trimmed : null
  }

  if (!Array.isArray(emailField)) return null

  for (const entry of emailField) {
    if (typeof entry === "string") {
      const trimmed = entry.trim()
      if (trimmed.includes("@")) return trimmed
      continue
    }
    if (!entry || typeof entry !== "object") continue

    const record = entry as Record<string, unknown>
    for (const key of ["Text", "Email", "Address"]) {
      const value = record[key]
      if (typeof value === "string" && value.trim().includes("@")) {
        return value.trim()
      }
    }
  }

  return null
}

export function contactsToRecipients(contacts: LacrmContact[]): LacrmGroupRecipient[] {
  const seen = new Set<string>()
  const recipients: LacrmGroupRecipient[] = []

  for (const contact of contacts) {
    const email = extractContactEmail(contact.Email)
    if (!email) continue
    const normalized = email.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    recipients.push({
      contactId: contact.ContactId,
      name: formatLacrmContactName(contact.Name) || email,
      email,
    })
  }

  return recipients
}

export async function createLacrmNote(
  apiKey: string,
  contactId: string,
  note: string,
): Promise<void> {
  await callLacrm(apiKey, "CreateNote", {
    ContactId: contactId,
    Note: note,
  })
}
