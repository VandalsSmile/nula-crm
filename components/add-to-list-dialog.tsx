"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { addContactsToTargetList } from "@/app/actions/target-lists"
import { useWriteGuard } from "@/lib/use-write-guard"

/**
 * Adds a single contact to a target list, prompting for an optional note that's
 * saved on the membership (shown in the list's Note column).
 */
export function AddToListDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  listId,
  listName,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
  listId: string
  listName: string
  onAdded?: () => void
}) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!guardWrite()) return
    setSaving(true)
    try {
      await addContactsToTargetList(listId, [contactId], note)
      toast.success(`Added ${contactName} to ${listName}`)
      onOpenChange(false)
      onAdded?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add to list")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setNote("")
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to {listName}</DialogTitle>
          <DialogDescription>
            Adding {contactName}. Add a note about why they&apos;re on this list or how to approach
            them — optional, and you can edit it later.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="add-list-note">Note (optional)</FieldLabel>
          <Textarea
            id="add-list-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Met at the trade show — interested in the enterprise plan."
            autoFocus
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Add to list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
