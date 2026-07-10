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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createAutomation,
  updateAutomation,
  type AutomationInput,
} from "@/app/actions/automations"

const TRIGGERS = [
  { value: "form_submitted", label: "When a new lead arrives" },
  { value: "cron_daily", label: "Daily check" },
  { value: "purchase_made", label: "When a purchase is made" },
  { value: "lead_scored", label: "When lead score is calculated" },
]

const ACTIONS = [
  { value: "new_lead_sequence", label: "Start new lead sequence" },
  { value: "mark_inactive_90", label: "Mark inactive customers" },
  { value: "review_request", label: "Send review request" },
  { value: "high_intent_alert", label: "High-intent alert" },
]

type AutomationRow = {
  id: string
  name: string
  trigger: string
  action: string
  enabled: boolean
}

export function AutomationFormDialog({
  open,
  onOpenChange,
  automation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  automation?: AutomationRow | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AutomationInput>({
    name: "",
    trigger: "form_submitted",
    action: "new_lead_sequence",
    enabled: true,
  })

  // Re-populate the form whenever the dialog opens or targets a different
  // automation, using React's "adjust state during render" pattern instead of a
  // state-setting effect.
  const resetKey = open ? (automation?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) {
      setForm({
        name: automation?.name ?? "",
        trigger: automation?.trigger ?? "form_submitted",
        action: automation?.action ?? "new_lead_sequence",
        enabled: automation?.enabled ?? true,
      })
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Automation name is required")
      return
    }
    setSaving(true)
    try {
      if (automation) {
        await updateAutomation(automation.id, form)
        toast.success("Automation updated")
      } else {
        await createAutomation(form)
        toast.success("Automation created")
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save automation")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{automation ? "Edit automation" : "Create automation"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Trigger</FieldLabel>
            <Select
              value={form.trigger}
              onValueChange={(value) => setForm((f) => ({ ...f, trigger: value ?? f.trigger }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Action</FieldLabel>
            <Select
              value={form.action}
              onValueChange={(value) => setForm((f) => ({ ...f, action: value ?? f.action }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
