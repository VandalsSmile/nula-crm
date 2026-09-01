"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus, Loader2 } from "lucide-react"
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
import { AssigneeField } from "@/components/assignee-field"
import { CompanySelect } from "@/components/company-select"
import { LocationSelect } from "@/components/location-select"
import { TagPicker } from "@/components/tag-picker"
import { useSessionUser } from "@/lib/session-context"
import { useWriteGuard } from "@/lib/use-write-guard"
import { createContact } from "@/app/actions/contacts"
import { lookupZip } from "@/app/actions/geo"
import type { Company } from "@/lib/crm-types"

type ContactForm = {
  firstName: string
  lastName: string
  companyName: string
  companyId: string
  locationId: string
  ownerId: string
  email: string
  phone: string
  websiteUrl: string
  address: string
  city: string
  state: string
  zip: string
  source: string
  tagIds: string[]
}

/** Build a blank contact form, optionally prefilled from a company (name +
 * contact details), e.g. when adding a contact from a company page. */
function makeForm(ownerId: string, company?: Company | null): ContactForm {
  return {
    firstName: "",
    lastName: "",
    companyName: company?.name ?? "",
    companyId: company?.id ?? "",
    locationId: "",
    ownerId,
    email: "",
    phone: company?.phone ?? "",
    websiteUrl: company?.website ?? "",
    address: company?.address ?? "",
    city: company?.city ?? "",
    state: company?.state ?? "",
    zip: company?.zip ?? "",
    source: "",
    tagIds: [],
  }
}

export function AddContactDialog({
  open,
  onOpenChange,
  defaultCompany,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Prefill company context — e.g. when opening from a company page. */
  defaultCompany?: Company | null
}) {
  const router = useRouter()
  const me = useSessionUser()
  const guardWrite = useWriteGuard()
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [form, setForm] = useState<ContactForm>(() => makeForm(me.id, defaultCompany))

  // Re-populate on open (adjust state during render — no state-setting effect),
  // so opening from a company page starts prefilled with that company.
  const resetKey = open ? (defaultCompany?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) setForm(makeForm(me.id, defaultCompany))
  }

  function reset() {
    setForm(makeForm(me.id, defaultCompany))
  }

  // Autofill city/state from a US ZIP without clobbering values already entered.
  async function handleZip(zip: string) {
    setForm((f) => ({ ...f, zip }))
    if (!/^\d{5}$/.test(zip.trim())) return
    const place = await lookupZip(zip)
    if (!place) return
    setForm((f) => ({
      ...f,
      city: f.city.trim() ? f.city : place.city,
      state: f.state.trim() ? f.state : place.state,
    }))
  }

  async function handleCreate() {
    if (!form.firstName.trim() && !form.companyName.trim()) {
      toast.error("Enter a first name or a company name")
      return
    }
    if (!guardWrite()) return
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
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
          </div>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <TagPicker
              selected={form.tagIds}
              onChange={(tagIds) => setForm((f) => ({ ...f, tagIds }))}
            />
          </Field>

          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={showMore ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"} />
            {showMore ? "Fewer details" : "More details (address, source, owner)"}
          </button>

          {showMore ? (
            <>
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
                  <Input value={form.zip} onChange={(e) => handleZip(e.target.value)} />
                </Field>
              </div>
              <Field>
                <FieldLabel>Source</FieldLabel>
                <Input placeholder="website, facebook, referral..." value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
              </Field>
              <AssigneeField
                label="Owner"
                value={form.ownerId}
                onChange={(ownerId) => setForm((f) => ({ ...f, ownerId }))}
              />
            </>
          ) : null}
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
