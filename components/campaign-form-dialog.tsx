"use client"

import { useEffect, useState } from "react"
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
import { updateCampaign } from "@/app/actions/campaigns"
import type { Campaign, Group } from "@/lib/crm-types"

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

  useEffect(() => {
    if (open && campaign) {
      setForm({
        name: campaign.name,
        goal: campaign.goal,
        audience: campaign.audience,
        groupId: campaign.groupId ?? "",
      })
    }
  }, [open, campaign])

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
      <DialogContent>
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
