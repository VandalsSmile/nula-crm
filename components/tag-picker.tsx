"use client"

import useSWR from "swr"

import { cn } from "@/lib/utils"
import { TagBadge } from "@/components/tag-badge"
import { listTags } from "@/app/actions/tags"
import type { Tag } from "@/lib/crm-types"

/** Toggleable colored tag chips for selecting tags (e.g. while creating a contact). */
export function TagPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (tagIds: string[]) => void
}) {
  const { data } = useSWR<Tag[]>("tags", listTags)
  const tags = data ?? []

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tags yet — create some on the Tags page.
      </p>
    )
  }

  return (
    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
      {tags.map((t) => {
        const on = selected.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            aria-pressed={on}
            className={cn(
              "rounded-full transition-opacity",
              on ? "opacity-100 ring-1 ring-ring/40" : "opacity-45 hover:opacity-80",
            )}
          >
            <TagBadge name={t.name} color={t.color} />
          </button>
        )
      })}
    </div>
  )
}
