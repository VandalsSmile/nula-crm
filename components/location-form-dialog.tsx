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
import { createLocation, updateLocation } from "@/app/actions/locations"
import type { Location } from "@/lib/crm-types"

type LocationFormValue = {
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
}

const EMPTY: LocationFormValue = { name: "", address: "", city: "", state: "", zip: "", phone: "" }

export function LocationFormDialog({
  open,
  onOpenChange,
  companyId,
  location,
  initialName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Required when creating a new location. */
  companyId?: string
  location?: Location | null
  initialName?: string
  onSaved?: (location: Location) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<LocationFormValue>(EMPTY)

  const resetKey = open ? (location?.id ?? "new") : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) {
      setForm(
        location
          ? {
              name: location.name,
              address: location.address,
              city: location.city,
              state: location.state,
              zip: location.zip,
              phone: location.phone,
            }
          : { ...EMPTY, name: initialName ?? "" },
      )
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Location name is required")
      return
    }
    if (!location && !companyId) {
      toast.error("Pick a company first")
      return
    }
    setSaving(true)
    try {
      const saved = location
        ? await updateLocation(location.id, form)
        : await createLocation(companyId as string, form)
      toast.success(location ? "Location updated" : "Location added")
      onOpenChange(false)
      onSaved?.(saved)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save location")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? "Edit location" : "Add location"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="e.g. Downtown branch"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
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
