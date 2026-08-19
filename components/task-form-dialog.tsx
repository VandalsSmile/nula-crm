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
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ContactSelect } from "@/components/contact-select"
import { OwnerSelect } from "@/components/owner-select"
import { createTask, updateTask } from "@/app/actions/tasks"
import { TASK_PRIORITIES, type Task, type TaskPriority } from "@/lib/crm-types"

function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type FormState = {
  title: string
  notes: string
  priority: TaskPriority
  due: string
  contactId: string
  assigneeId: string
}

function makeForm(task: Task | null | undefined, defaultContactId: string): FormState {
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    priority: task?.priority ?? "normal",
    due: toLocalInput(task?.dueAt ?? null),
    contactId: task?.contactId ?? defaultContactId ?? "",
    assigneeId: task?.assigneeId ?? "",
  }
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultContactId = "",
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  defaultContactId?: string
  onSaved?: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(() => makeForm(task, defaultContactId))

  // Re-populate whenever the dialog opens or targets a different task.
  const resetKey = open ? (task?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) setForm(makeForm(task, defaultContactId))
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Task title is required")
      return
    }
    setSaving(true)
    try {
      const dueAt = form.due ? new Date(form.due).toISOString() : null
      const payload = {
        title: form.title,
        notes: form.notes,
        priority: form.priority,
        dueAt,
        contactId: form.contactId,
        assigneeId: form.assigneeId,
      }
      if (task) await updateTask(task.id, payload)
      else await createTask(payload)
      toast.success(task ? "Task updated" : "Task created")
      onOpenChange(false)
      onSaved?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Follow up with…"
              autoFocus
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Due</FieldLabel>
              <Input
                type="datetime-local"
                value={form.due}
                onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: (v as TaskPriority) || "normal" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel>Contact</FieldLabel>
            <ContactSelect
              value={form.contactId}
              onChange={(contactId) => setForm((f) => ({ ...f, contactId }))}
            />
          </Field>
          <Field>
            <FieldLabel>Assignee</FieldLabel>
            <OwnerSelect
              value={form.assigneeId}
              onChange={(assigneeId) => setForm((f) => ({ ...f, assigneeId }))}
            />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Details, context, links…"
            />
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
