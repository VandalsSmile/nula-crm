/** Frequently used US timezones shown at the top of the picker. */
export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const

const FALLBACK_TIMEZONES = [
  ...COMMON_TIMEZONES,
  "America/Detroit",
  "America/Indiana/Indianapolis",
  "America/Boise",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
] as const

/** All IANA zones when the runtime supports them, otherwise a curated fallback list. */
export function allTimezones(): string[] {
  try {
    const supported = Intl.supportedValuesOf("timeZone")
    return [...supported].sort((a, b) => formatTimezoneLabel(a).localeCompare(formatTimezoneLabel(b)))
  } catch {
    return [...FALLBACK_TIMEZONES]
  }
}

/** Human-friendly label for display, e.g. "New York (EDT)". */
export function formatTimezoneLabel(timeZone: string, ref = new Date()): string {
  if (!timeZone) return "Select timezone"
  try {
    const short =
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
        .formatToParts(ref)
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone
    return short ? `${city} (${short})` : city
  } catch {
    return timeZone
  }
}

/** Ensure a stored value appears in the picker even if it is uncommon. */
export function timezoneOptions(current?: string | null): string[] {
  const all = allTimezones()
  if (!current || all.includes(current)) return all
  return [current, ...all]
}
