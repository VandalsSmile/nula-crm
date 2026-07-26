"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagBadge } from "@/components/tag-badge"
import { createTag, listTags } from "@/app/actions/tags"
import type { Tag } from "@/lib/crm-types"

const DEFAULT_NEW_TAG_COLOR = "#4F3DF5"

/** Toggleable colored tag chips for selecting tags (e.g. while creating a
 * contact), plus an inline "create tag" row so a new tag can be made on the fly
 * without leaving the form — it's created and auto-selected in place. */
export function TagPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (tagIds: string[]) => void
}) {
  const { data, mutate } = useSWR<Tag[]>("tags", listTags)
  const tags = data ?? []

  const [name, setName] = useState("")
  const [color, setColor] = useState(DEFAULT_NEW_TAG_COLOR)
  const [creating, setCreating] = useState(false)

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || creating) return

    // If a tag with this name already exists, just select it rather than making
    // a duplicate.
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      if (!selected.includes(existing.id)) onChange([...selected, existing.id])
      setName("")
      return
    }

    setCreating(true)
    try {
      const created = await createTag({ name: trimmed, color })
      const newTag: Tag = {
        id: created.id,
        name: created.name,
        slug: created.slug,
        color: created.color || color,
        description: created.description ?? "",
      }
      await mutate([...tags, newTag], { revalidate: false })
      onChange([...selected, newTag.id])
      setName("")
      setColor(DEFAULT_NEW_TAG_COLOR)
      toast.success(`Created tag "${newTag.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create tag")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">
          No tags yet — create your first one below.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="color"
          aria-label="New tag color"
          className="h-9 w-11 shrink-0 cursor-pointer p-1"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <Input
          placeholder="New tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </div>
    </div>
  )
}
