"use server"

/**
 * Look up the city and state for a US 5-digit ZIP code, so address forms can
 * autofill them. Uses the free, key-less zippopotam.us API and caches results
 * (ZIP→place data is effectively static). Returns null on any miss/error so the
 * caller can silently skip autofill.
 */
export async function lookupZip(
  zip: string,
): Promise<{ city: string; state: string } | null> {
  const z = zip.trim()
  if (!/^\d{5}$/.test(z)) return null
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${z}`, {
      cache: "force-cache",
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      places?: Array<{ "place name"?: string; "state abbreviation"?: string }>
    }
    const place = data.places?.[0]
    if (!place) return null
    return {
      city: place["place name"]?.trim() ?? "",
      state: place["state abbreviation"]?.trim() ?? "",
    }
  } catch {
    return null
  }
}
