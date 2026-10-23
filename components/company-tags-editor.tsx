"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { TagBadge } from "@/components/tag-badge"
import { TagFormDialog } from "@/components/tag-form-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addTagToCompany, removeTagFromCompany } from "@/app/actions/tags"
import type { Company, Tag } from "@/lib/crm-types"

const CREATE_TAG = "__create_tag__"

/** Add/remove tags on a company — mirrors the contact Tags picker. */
export function CompanyTagsEditor({
  company,
  allTags,
}: {
  company: Company
  allTags: Tag[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [createTagOpen, setCreateTagOpen] = useState(false)
  // Bumped after each pick to remount the picker so its trigger resets to the
  // "Add tag" placeholder instead of retaining the chosen value.
  const [tagPickerKey, setTagPickerKey] = useState(0)

  const availableTags = allTags.filter((t) => !company.tags.some((ct) => ct.id === t.id))

  function addTag(tagId: string | null) {
    if (!tagId) return
    startTransition(async () => {
      try {
        await addTagToCompany(company.id, tagId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add tag")
      }
    })
  }

  function handleAddTag(value: string | null) {
    setTagPickerKey((k) => k + 1)
    if (value === CREATE_TAG) {
      setCreateTagOpen(true)
      return
    }
    addTag(value)
  }

  function removeTag(tagId: string) {
    startTransition(async () => {
      try {
        await removeTagFromCompany(company.id, tagId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove tag")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {company.tags.length ? (
          company.tags.map((t) => (
            <TagBadge
              key={t.id}
              name={t.name}
              color={t.color}
              onRemove={() => removeTag(t.id)}
              removeDisabled={pending}
            />
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No tags</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Select key={tagPickerKey} onValueChange={handleAddTag}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="Add tag" />
          </SelectTrigger>
          <SelectContent>
            {availableTags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
            {availableTags.length > 0 ? <SelectSeparator /> : null}
            <SelectItem value={CREATE_TAG}>
              <Plus />
              New tag…
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TagFormDialog
        open={createTagOpen}
        onOpenChange={setCreateTagOpen}
        onSaved={(tag) => addTag(tag.id)}
      />
    </div>
  )
}
