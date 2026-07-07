/**
 * Convert a wall-clock date + time entered in a specific IANA timezone into a
 * UTC ISO string.
 *
 * The browser's `new Date("YYYY-MM-DDTHH:mm")` parses in the *browser's* local
 * timezone, which is wrong when an agency operator schedules a post in their
 * client's timezone (e.g. picking "9:00 AM America/New_York" from a Pacific
 * laptop). This computes the real UTC instant for the given zone, DST-aware.
 *
 * @param dateStr "YYYY-MM-DD"
 * @param timeStr "HH:mm"
 * @param timeZone IANA zone, e.g. "America/New_York"
 * @returns UTC ISO string, or null if the inputs are invalid.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): string | null {
  const [y, mo, d] = (dateStr ?? "").split("-").map(Number)
  const [h, mi] = (timeStr ?? "").split(":").map(Number)
  // Number.isFinite rejects undefined (missing parts) and NaN alike.
  if (![y, mo, d, h, mi].every((n) => Number.isFinite(n))) return null

  // The instant if the entered wall clock were UTC.
  const asUTC = Date.UTC(y, mo - 1, d, h, mi)

  // Render that instant in the target zone to discover the zone's offset.
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(asUTC))
  } catch {
    // Invalid timezone — fall back to treating the input as UTC.
    return new Date(asUTC).toISOString()
  }

  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value)
  }
  // Intl renders midnight as hour "24"; normalize to 0.
  if (map.hour === 24) map.hour = 0

  const asZoned = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
  const offset = asZoned - asUTC
  return new Date(asUTC - offset).toISOString()
}

/** Split a UTC ISO instant into date/time strings for a given IANA timezone. */
export function utcIsoToZonedDateAndTime(
  iso: string,
  timeZone: string,
): { date: string; time: string } | null {
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return null

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(instant)

    const map: Record<string, string> = {}
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value
    }
    if (map.hour === "24") map.hour = "00"
    if (!map.year || !map.month || !map.day || map.hour === undefined || map.minute === undefined) {
      return null
    }

    return {
      date: `${map.year}-${map.month}-${map.day}`,
      time: `${map.hour}:${map.minute}`,
    }
  } catch {
    return null
  }
}
