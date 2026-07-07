"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function useUrlTab<T extends string>(
  param: string,
  validValues: readonly T[],
  defaultValue: T,
): [T, (value: T) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value = useMemo(() => {
    const raw = searchParams.get(param)
    if (raw && validValues.includes(raw as T)) {
      return raw as T
    }
    return defaultValue
  }, [searchParams, param, validValues, defaultValue])

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === defaultValue) {
        params.delete(param)
      } else {
        params.set(param, next)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, param, defaultValue],
  )

  return [value, setValue]
}
