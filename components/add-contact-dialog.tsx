"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
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
import { OwnerSelect } from "@/components/owner-select"
import { CompanySelect } from "@/components/company-select"
import { LocationSelect } from "@/components/location-select"
import { TagPicker } from "@/components/tag-picker"
import { useSessionUser } from "@/lib/session-context"
import { createContact } from "@/app/actions/contacts"

export function AddContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const me = useSessionUser()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    companyId: "",
    locationId: "",
    ownerId: me.id,
    email: "",
    phone: "",
    websiteUrl: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    source: "",
    tagIds: [] as string[],
  })

  function reset() {
    setForm({
      firstName: "",
      lastName: "",
      companyName: "",
      companyId: "",
      locationId: "",
      ownerId: me.id,
      email: "",
      phone: "",
      websiteUrl: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      source: "",
      tagIds: [],
    })
  }

  async function handleCreate() {
    if (!form.firstName.trim() && !form.companyName.trim()) {
      toast.error("Enter a first name or a company name")
      return
    }
    setSaving(true)
    try {
      await createContact(form)
      toast.success("Contact created")
      reset()
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create contact")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>First name</FieldLabel>
              <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Last name</FieldLabel>
              <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </Field>
          </div>
          <Field>
            <FieldLabel>Company</FieldLabel>
            <CompanySelect
              value={form.companyId}
              onChange={(companyId, companyName, company) =>
                setForm((f) => ({
                  ...f,
                  companyId,
                  companyName,
                  locationId: "",
                  // Prefill empty fields from the company's details.
                  websiteUrl: f.websiteUrl || company?.website || "",
                  phone: f.phone || company?.phone || "",
                  address: f.address || company?.address || "",
                  city: f.city || company?.city || "",
                  state: f.state || company?.state || "",
                  zip: f.zip || company?.zip || "",
                }))
              }
            />
          </Field>
          {form.companyId ? (
            <Field>
              <FieldLabel>Location</FieldLabel>
              <LocationSelect
                companyId={form.companyId}
                value={form.locationId}
                onChange={(locationId, location) =>
                  setForm((f) => ({
                    ...f,
                    locationId,
                    // A chosen location is more specific — use its address/phone.
                    address: location?.address || f.address,
                    city: location?.city || f.city,
                    state: location?.state || f.state,
                    zip: location?.zip || f.zip,
                    phone: location?.phone || f.phone,
                  }))
                }
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
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
          <div className="grid grid-cols-3 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Source</FieldLabel>
              <Input placeholder="website, facebook, referral..." value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Owner</FieldLabel>
              <OwnerSelect value={form.ownerId} onChange={(ownerId) => setForm((f) => ({ ...f, ownerId }))} />
            </Field>
          </div>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <TagPicker
              selected={form.tagIds}
              onChange={(tagIds) => setForm((f) => ({ ...f, tagIds }))}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
