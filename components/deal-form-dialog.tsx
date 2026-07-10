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
import { createDeal, updateDeal, type DealInput } from "@/app/actions/deals"
import { DEAL_STAGES, type Deal } from "@/lib/crm-types"

export function DealFormDialog({
  open,
  onOpenChange,
  contactId,
  deal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  deal?: Deal | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    offerInterest: "",
    stage: "New Lead" as DealInput["stage"],
    estimatedValue: "",
    probability: "0",
    nextStep: "",
  })

  // Re-populate the form whenever the dialog opens or targets a different deal,
  // using React's "adjust state during render" pattern instead of a
  // state-setting effect.
  const resetKey = open ? (deal?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) {
      setForm({
        title: deal?.title ?? "",
        offerInterest: deal?.offerInterest ?? "",
        stage: deal?.stage ?? "New Lead",
        estimatedValue: deal ? String(deal.estimatedValueCents / 100) : "",
        probability: String(deal?.probability ?? 0),
        nextStep: deal?.nextStep ?? "",
      })
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Deal title is required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        contactId,
        title: form.title,
        offerInterest: form.offerInterest,
        stage: form.stage,
        estimatedValueCents: Math.round(parseFloat(form.estimatedValue || "0") * 100),
        probability: parseInt(form.probability || "0", 10),
        nextStep: form.nextStep,
      }
      if (deal) {
        await updateDeal(deal.id, payload)
        toast.success("Deal updated")
      } else {
        await createDeal(payload)
        toast.success("Deal created")
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save deal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deal ? "Edit deal" : "Add deal"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Offer / interest</FieldLabel>
            <Input
              value={form.offerInterest}
              onChange={(e) => setForm((f) => ({ ...f, offerInterest: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Stage</FieldLabel>
            <Select
              value={form.stage}
              onValueChange={(value) => setForm((f) => ({ ...f, stage: value as DealInput["stage"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Est. value ($)</FieldLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedValue}
                onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Probability (%)</FieldLabel>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Next step</FieldLabel>
            <Input value={form.nextStep} onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))} />
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
