"use client"

import { useCallback, useSyncExternalStore } from "react"

export type ViewMode = "grid" | "list"

/**
 * A localStorage-backed grid/list view preference. Uses useSyncExternalStore so
 * it hydrates cleanly (server renders the default) and reacts to changes without
 * a state-setting effect.
 */
export function useViewMode(key: string, initial: ViewMode = "grid") {
  const storageKey = `nula-view:${key}`

  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("nula-view-change", cb)
    window.addEventListener("storage", cb)
    return () => {
      window.removeEventListener("nula-view-change", cb)
      window.removeEventListener("storage", cb)
    }
  }, [])

  const getSnapshot = useCallback((): ViewMode => {
    try {
      const v = localStorage.getItem(storageKey)
      return v === "grid" || v === "list" ? v : initial
    } catch {
      return initial
    }
  }, [storageKey, initial])

  const getServerSnapshot = useCallback(() => initial, [initial])

  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setMode = useCallback(
    (m: ViewMode) => {
      try {
        localStorage.setItem(storageKey, m)
      } catch {
        // ignore (e.g. storage disabled)
      }
      window.dispatchEvent(new Event("nula-view-change"))
    },
    [storageKey],
  )

  return [mode, setMode] as const
}
