"use client"

import { LayoutGrid, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ViewMode } from "@/hooks/use-view-mode"

/** Grid / list view switcher. */
export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border p-0.5">
      <Button
        variant={mode === "grid" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={mode === "grid"}
      >
        <LayoutGrid />
      </Button>
      <Button
        variant={mode === "list" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={mode === "list"}
      >
        <List />
      </Button>
    </div>
  )
}
