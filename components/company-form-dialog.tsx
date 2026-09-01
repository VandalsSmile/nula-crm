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
import { createCompany, updateCompany } from "@/app/actions/companies"
import { lookupZip } from "@/app/actions/geo"
import { useWriteGuard } from "@/lib/use-write-guard"
import type { Company } from "@/lib/crm-types"

type CompanyFormValue = {
  name: string
  website: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
}

const EMPTY: CompanyFormValue = {
  name: "",
  website: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  initialName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: Company | null
  /** Prefill the name when creating (e.g. from a picker's typed text). */
  initialName?: string
  onSaved?: (company: Company) => void
}) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CompanyFormValue>(EMPTY)

  // Re-populate on open (adjust state during render — no state-setting effect).
  const resetKey = open ? (company?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) {
      setForm(
        company
          ? {
              name: company.name,
              website: company.website,
              phone: company.phone,
              address: company.address,
              city: company.city,
              state: company.state,
              zip: company.zip,
              notes: company.notes,
            }
          : { ...EMPTY, name: initialName ?? "" },
      )
    }
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

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Company name is required")
      return
    }
    // Bail out early with a clear upgrade prompt when the trial has ended, rather
    // than letting the server action throw a redacted, cryptic error.
    if (!guardWrite()) return
    setSaving(true)
    try {
      const saved = company ? await updateCompany(company.id, form) : await createCompany(form)
      toast.success(company ? "Company updated" : "Company created")
      onOpenChange(false)
      onSaved?.(saved)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save company")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? "Edit company" : "Add company"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Website</FieldLabel>
              <Input
                placeholder="https://"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
          </div>
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
