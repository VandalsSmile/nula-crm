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
import { OwnerSelect } from "@/components/owner-select"
import { CompanySelect } from "@/components/company-select"
import { updateContact, type ContactInput } from "@/app/actions/contacts"
import { LIFECYCLE_STAGES, type Contact } from "@/lib/crm-types"

export function EditContactDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ContactInput>({
    firstName: "",
    lastName: "",
    companyName: "",
    companyId: "",
    ownerId: "",
    email: "",
    phone: "",
    websiteUrl: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    source: "",
    lifecycleStage: "New Lead",
    notes: "",
  })

  // Re-populate the form whenever the dialog opens or targets a different
  // contact, using React's "adjust state during render" pattern instead of a
  // state-setting effect.
  const resetKey = open && contact ? contact.id : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open && contact) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyName: contact.companyName,
        companyId: contact.companyId,
        ownerId: contact.ownerId,
        email: contact.email,
        phone: contact.phone,
        websiteUrl: contact.websiteUrl,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zip: contact.zip,
        source: contact.source,
        lifecycleStage: contact.lifecycleStage,
        notes: contact.notes,
      })
    }
  }

  async function handleSave() {
    if (!form.firstName?.trim() && !form.companyName?.trim()) {
      toast.error("Enter a first name or a company name")
      return
    }
    setSaving(true)
    try {
      await updateContact(contact.id, form)
      toast.success("Contact saved")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save contact")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>First name</FieldLabel>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Last name</FieldLabel>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Company</FieldLabel>
            <CompanySelect
              value={form.companyId ?? ""}
              onChange={(companyId, companyName) => setForm((f) => ({ ...f, companyId, companyName }))}
            />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Website</FieldLabel>
            <Input
              placeholder="https://"
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Address</FieldLabel>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>City</FieldLabel>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>State</FieldLabel>
              <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>ZIP</FieldLabel>
              <Input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
            </Field>
          </div>
          <Field>
            <FieldLabel>Source</FieldLabel>
            <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Owner</FieldLabel>
            <OwnerSelect value={form.ownerId ?? ""} onChange={(ownerId) => setForm((f) => ({ ...f, ownerId }))} />
          </Field>
          <Field>
            <FieldLabel>Lifecycle stage</FieldLabel>
            <Select
              value={form.lifecycleStage}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, lifecycleStage: value as ContactInput["lifecycleStage"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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
