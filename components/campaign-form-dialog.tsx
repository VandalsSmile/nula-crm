"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
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
import { updateCampaign } from "@/app/actions/campaigns"
import type { Campaign, CampaignStep, Group } from "@/lib/crm-types"

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: Campaign
  groups: Group[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", goal: "", audience: "", groupId: "" })
  const [steps, setSteps] = useState<CampaignStep[]>([])

  useEffect(() => {
    if (open && campaign) {
      setForm({
        name: campaign.name,
        goal: campaign.goal,
        audience: campaign.audience,
        groupId: campaign.groupId ?? "",
      })
      setSteps(campaign.sequence ?? [])
    }
  }, [open, campaign])

  function updateStep(index: number, patch: Partial<CampaignStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { step: prev.length + 1, channel: "email", subject: "", body: "", delayDays: prev.length === 0 ? 0 : 3 },
    ])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Campaign name is required")
      return
    }
    setSaving(true)
    try {
      await updateCampaign(campaign.id, {
        name: form.name,
        goal: form.goal,
        audience: form.audience,
        groupId: form.groupId || null,
        sequence: steps,
      })
      toast.success("Campaign saved")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save campaign")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Goal</FieldLabel>
            <Input value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Audience description</FieldLabel>
            <Input
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Target group</FieldLabel>
            <Select
              value={form.groupId || "__none__"}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, groupId: value === "__none__" || !value ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Message sequence</FieldLabel>
            <div className="flex flex-col gap-3">
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No steps yet. Add one to build a multi-step email/SMS sequence.
                </p>
              ) : null}
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                    <Select
                      value={s.channel}
                      onValueChange={(v) => updateStep(i, { channel: v === "sms" ? "sms" : "email" })}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={String(s.delayDays ?? 0)}
                        onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) })}
                        className="h-8 w-16"
                        aria-label={`Step ${i + 1} delay in days`}
                      />
                      <span className="text-xs text-muted-foreground">days after launch</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto"
                      onClick={() => removeStep(i)}
                      aria-label={`Remove step ${i + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {s.channel === "email" ? (
                    <Input
                      placeholder="Subject"
                      value={s.subject ?? ""}
                      onChange={(e) => updateStep(i, { subject: e.target.value })}
                    />
                  ) : null}
                  <Textarea
                    placeholder="Message body"
                    rows={2}
                    value={s.body ?? ""}
                    onChange={(e) => updateStep(i, { body: e.target.value })}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addStep}>
                <Plus data-icon="inline-start" />
                Add step
              </Button>
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
