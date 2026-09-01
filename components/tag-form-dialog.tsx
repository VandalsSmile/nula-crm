"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { createTag, updateTag } from "@/app/actions/tags"
import { useWriteGuard } from "@/lib/use-write-guard"
import type { Tag } from "@/lib/crm-types"

export function TagFormDialog({
  open,
  onOpenChange,
  tag,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: Tag | null
  /** Called with the created/updated tag (e.g. to apply it to a contact). */
  onSaved?: (tag: Tag) => void
}) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", color: "#4F3DF5" })

  // Re-populate the form whenever the dialog opens or targets a different tag,
  // using React's "adjust state during render" pattern instead of a
  // state-setting effect.
  const resetKey = open ? (tag?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) {
      setForm({
        name: tag?.name ?? "",
        description: tag?.description ?? "",
        color: tag?.color ?? "#4F3DF5",
      })
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Tag name is required")
      return
    }
    if (!guardWrite()) return
    setSaving(true)
    try {
      const saved = tag ? await updateTag(tag.id, form) : await createTag(form)
      toast.success(tag ? "Tag updated" : "Tag created")
      onOpenChange(false)
      onSaved?.({
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        color: saved.color,
        description: saved.description,
      })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save tag")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tag ? "Edit tag" : "Create tag"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Color</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                className="h-10 w-14 cursor-pointer p-1"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              />
              <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
