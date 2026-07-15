"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LocationFormDialog } from "@/components/location-form-dialog"
import { listLocations } from "@/app/actions/locations"
import type { Location } from "@/lib/crm-types"

const NONE = "__none__"
const CREATE = "__create__"

/**
 * Picks a specific location within a company. Only meaningful once a company is
 * chosen; renders nothing when companyId is empty. Emits "" for no location.
 */
export function LocationSelect({
  companyId,
  value,
  onChange,
  id,
}: {
  companyId: string
  value: string
  onChange: (locationId: string) => void
  id?: string
}) {
  const { data: locs, mutate } = useSWR<Location[]>(
    companyId ? ["locations", companyId] : null,
    () => listLocations(companyId),
  )
  const [createOpen, setCreateOpen] = useState(false)

  if (!companyId) return null

  function labelFor(locationId: string) {
    if (!locationId || locationId === NONE) return "No specific location"
    return locs?.find((l) => l.id === locationId)?.name ?? "No specific location"
  }

  function handleChange(next: string | null) {
    if (next === CREATE) {
      setCreateOpen(true)
      return
    }
    onChange(!next || next === NONE ? "" : next)
  }

  return (
    <>
      <Select value={value || NONE} onValueChange={handleChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(current: string) => labelFor(current)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No specific location</SelectItem>
          {(locs ?? []).map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE}>
            <Plus />
            New location…
          </SelectItem>
        </SelectContent>
      </Select>

      <LocationFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={companyId}
        onSaved={(location) => {
          void mutate()
          onChange(location.id)
        }}
      />
    </>
  )
}
