"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import {
  addContactToGroup,
  removeContactFromGroup,
} from "@/app/actions/groups"
import {
  addTagToContact,
  removeTagFromContact,
} from "@/app/actions/tags"
import type { Contact, Group, Tag } from "@/lib/crm-types"

const CREATE_TAG = "__create_tag__"

export function ContactRelationsEditor({
  contact,
  allTags,
  allGroups,
}: {
  contact: Contact
  allTags: Tag[]
  allGroups: Group[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [createTagOpen, setCreateTagOpen] = useState(false)
  // Bumped after each pick to remount the picker so its trigger resets to the
  // "Add tag" placeholder instead of retaining the chosen value.
  const [tagPickerKey, setTagPickerKey] = useState(0)

  const availableTags = allTags.filter((t) => !contact.tags.some((ct) => ct.id === t.id))
  const availableGroups = allGroups.filter((g) => !contact.groups.some((cg) => cg.id === g.id))

  function addTag(tagId: string | null) {
    if (!tagId) return
    startTransition(async () => {
      try {
        await addTagToContact(contact.id, tagId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add tag")
      }
    })
  }

  // "New tag…" in the picker opens the create dialog, then applies the new tag.
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
        await removeTagFromContact(contact.id, tagId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove tag")
      }
    })
  }

  function addGroup(groupId: string | null) {
    if (!groupId) return
    startTransition(async () => {
      try {
        await addContactToGroup(contact.id, groupId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add to group")
      }
    })
  }

  function removeGroup(groupId: string) {
    startTransition(async () => {
      try {
        await removeContactFromGroup(contact.id, groupId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove from group")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.length ? (
            contact.tags.map((t) => (
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
        <div className="mt-2 flex items-center gap-2">
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
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Groups</p>
        <div className="flex flex-wrap gap-1.5">
          {contact.groups.length ? (
            contact.groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="gap-1 pr-1">
                {g.name}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  disabled={pending}
                  onClick={() => removeGroup(g.id)}
                  aria-label={`Remove from ${g.name}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No groups</span>
          )}
        </div>
        {availableGroups.length > 0 ? (
          <div className="mt-2 flex items-center gap-2">
            <Select onValueChange={addGroup}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="Add to group" />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <TagFormDialog
        open={createTagOpen}
        onOpenChange={setCreateTagOpen}
        onSaved={(tag) => addTag(tag.id)}
      />
    </div>
  )
}
