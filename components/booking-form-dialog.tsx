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
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ContactSelect } from "@/components/contact-select"
import { createBooking, updateBooking } from "@/app/actions/bookings"
import { useWriteGuard } from "@/lib/use-write-guard"
import type { Booking } from "@/lib/crm-types"

function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type FormState = {
  title: string
  start: string
  end: string
  location: string
  contactId: string
  notes: string
}

function makeForm(
  booking: Booking | null | undefined,
  defaultStartAt?: string | null,
  defaultContactId?: string,
): FormState {
  return {
    title: booking?.title ?? "",
    start: toLocalInput(booking?.startAt ?? defaultStartAt ?? null),
    end: toLocalInput(booking?.endAt ?? null),
    location: booking?.location ?? "",
    contactId: booking?.contactId ?? defaultContactId ?? "",
    notes: booking?.notes ?? "",
  }
}

export function BookingFormDialog({
  open,
  onOpenChange,
  booking,
  defaultStartAt = null,
  defaultContactId = "",
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking?: Booking | null
  defaultStartAt?: string | null
  defaultContactId?: string
  onSaved?: () => void
}) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(() => makeForm(booking, defaultStartAt, defaultContactId))

  const resetKey = open ? (booking?.id ?? `new:${defaultStartAt ?? ""}:${defaultContactId}`) : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (open) setForm(makeForm(booking, defaultStartAt, defaultContactId))
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!guardWrite()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        startAt: form.start ? new Date(form.start).toISOString() : null,
        endAt: form.end ? new Date(form.end).toISOString() : null,
        location: form.location,
        contactId: form.contactId,
        notes: form.notes,
      }
      if (booking) await updateBooking(booking.id, payload)
      else await createBooking(payload)
      toast.success(booking ? "Appointment updated" : "Appointment added")
      onOpenChange(false)
      onSaved?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save appointment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booking ? "Edit appointment" : "New appointment"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Intro call, consultation…"
              autoFocus
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Starts</FieldLabel>
              <Input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Ends</FieldLabel>
              <Input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Zoom link, address, phone…"
            />
          </Field>
          <Field>
            <FieldLabel>Contact</FieldLabel>
            <ContactSelect
              value={form.contactId}
              onChange={(contactId) => setForm((f) => ({ ...f, contactId }))}
            />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Agenda, context…"
            />
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
