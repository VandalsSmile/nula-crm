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
  removeFromTargetList,
  setTargetMemberOwner,
  setTargetMemberStatus,
} from "@/app/actions/target-lists"
import { AddToListDialog } from "@/components/add-to-list-dialog"
import { OwnerSelect } from "@/components/owner-select"
import {
  addTagToContact,
  removeTagFromContact,
} from "@/app/actions/tags"
import { relativeTime } from "@/lib/format"
import {
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUSES,
  TARGET_LIST_TYPE,
  type Contact,
  type ContactTargetListMembership,
  type Group,
  type OutreachStatus,
  type Tag,
  type TargetList,
} from "@/lib/crm-types"

const CREATE_TAG = "__create_tag__"

export function ContactRelationsEditor({
  contact,
  allTags,
  allGroups,
  targetLists = [],
  targetListMemberships = [],
}: {
  contact: Contact
  allTags: Tag[]
  allGroups: Group[]
  targetLists?: TargetList[]
  targetListMemberships?: ContactTargetListMembership[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [createTagOpen, setCreateTagOpen] = useState(false)
  // Bumped after each pick to remount the picker so its trigger resets to the
  // "Add tag" placeholder instead of retaining the chosen value.
  const [tagPickerKey, setTagPickerKey] = useState(0)
  const [listPickerKey, setListPickerKey] = useState(0)
  const [addListTarget, setAddListTarget] = useState<{ id: string; name: string } | null>(null)

  const availableTags = allTags.filter((t) => !contact.tags.some((ct) => ct.id === t.id))
  // `contact.groups` includes target lists (both are rows in `groups`); keep the
  // two concepts separate in the UI.
  const audienceGroups = contact.groups.filter((g) => g.type !== TARGET_LIST_TYPE)
  const availableGroups = allGroups.filter((g) => !contact.groups.some((cg) => cg.id === g.id))
  const availableLists = targetLists.filter(
    (l) => !targetListMemberships.some((m) => m.listId === l.id),
  )

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

  // Opens a dialog that prompts for an optional note before adding to the list.
  function openAddToList(listId: string | null) {
    setListPickerKey((k) => k + 1)
    if (!listId) return
    const list = targetLists.find((l) => l.id === listId)
    if (list) setAddListTarget({ id: list.id, name: list.name })
  }

  function removeFromList(listId: string) {
    startTransition(async () => {
      try {
        await removeFromTargetList(listId, contact.id)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove from list")
      }
    })
  }

  function setListStatus(listId: string, status: OutreachStatus) {
    startTransition(async () => {
      try {
        await setTargetMemberStatus(listId, contact.id, status)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update status")
      }
    })
  }

  function setListOwner(listId: string, ownerId: string) {
    startTransition(async () => {
      try {
        await setTargetMemberOwner(listId, contact.id, ownerId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update owner")
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
          {audienceGroups.length ? (
            audienceGroups.map((g) => (
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

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Target lists</p>
        {targetListMemberships.length ? (
          <div className="flex flex-col gap-2">
            {targetListMemberships.map((m) => (
              <div key={m.listId} className="rounded-lg border bg-muted/20 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-medium">{m.listName}</span>
                  <button
                    type="button"
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    disabled={pending}
                    onClick={() => removeFromList(m.listId)}
                    aria-label={`Remove from ${m.listName}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Status
                    <Select
                      value={m.status}
                      onValueChange={(v) => setListStatus(m.listId, (v as OutreachStatus) ?? "new")}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTREACH_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {OUTREACH_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Owner
                    <OwnerSelect value={m.ownerId} onChange={(ownerId) => setListOwner(m.listId, ownerId)} />
                  </label>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Last touch: {m.lastTouchedAt ? relativeTime(m.lastTouchedAt) : "—"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not on any list</span>
        )}
        {availableLists.length > 0 ? (
          <div className="mt-2 flex items-center gap-2">
            <Select key={listPickerKey} onValueChange={openAddToList}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="Add to list" />
              </SelectTrigger>
              <SelectContent>
                {availableLists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
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

      {addListTarget ? (
        <AddToListDialog
          open={!!addListTarget}
          onOpenChange={(o) => !o && setAddListTarget(null)}
          contactId={contact.id}
          contactName={contact.fullName}
          listId={addListTarget.id}
          listName={addListTarget.name}
        />
      ) : null}
    </div>
  )
}
