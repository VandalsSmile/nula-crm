"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { TimezonePicker } from "@/components/timezone-picker"
import { updateClient } from "@/app/actions/clients"
import type { Client } from "@/lib/mock-data"

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: client.name,
    websiteUrl: client.websiteUrl,
    contactName: client.contactName,
    contactEmail: client.contactEmail,
    phone: client.phone,
    location: client.location,
    timezone: client.timezone,
    industry: client.industry,
    brandVoice: client.brandVoice,
    targetAudience: client.targetAudience,
    commonServices: client.commonServices,
    notes: client.notes,
  })

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Client name is required")
      return
    }
    setSaving(true)
    try {
      await updateClient(client.id, form)
      toast.success("Client updated")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update client")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {client.name}</DialogTitle>
          <DialogDescription>Update client profile details.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-name">Client name</FieldLabel>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-website">Website</FieldLabel>
            <Input
              id="edit-website"
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-contact">Contact name</FieldLabel>
            <Input
              id="edit-contact"
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-email">Contact email</FieldLabel>
            <Input
              id="edit-email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-phone">Phone</FieldLabel>
            <Input
              id="edit-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-location">Location</FieldLabel>
            <Input
              id="edit-location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <TimezonePicker
              value={form.timezone}
              onChange={(timezone) => setForm((f) => ({ ...f, timezone }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-industry">Industry</FieldLabel>
            <Input
              id="edit-industry"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-voice">Brand voice</FieldLabel>
            <Textarea
              id="edit-voice"
              value={form.brandVoice}
              onChange={(e) => setForm((f) => ({ ...f, brandVoice: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-audience">Target audience</FieldLabel>
            <Textarea
              id="edit-audience"
              value={form.targetAudience}
              onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-services">Services</FieldLabel>
            <Textarea
              id="edit-services"
              value={form.commonServices}
              onChange={(e) => setForm((f) => ({ ...f, commonServices: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
            <Textarea
              id="edit-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
