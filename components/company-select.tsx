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
import { CompanyFormDialog } from "@/components/company-form-dialog"
import { listCompanies } from "@/app/actions/companies"
import type { Company } from "@/lib/crm-types"

const NONE = "__none__"
const CREATE = "__create__"

/**
 * Picks the company a contact belongs to. Emits both the company id and name so
 * the caller can keep the denormalized companyName in sync. A "New company…"
 * option opens an inline create dialog and selects the created company.
 */
export function CompanySelect({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (companyId: string, companyName: string) => void
  id?: string
}) {
  const { data: comps, mutate } = useSWR<Company[]>("companies", listCompanies)
  const [createOpen, setCreateOpen] = useState(false)

  function labelFor(companyId: string) {
    if (!companyId || companyId === NONE) return "No company"
    return comps?.find((c) => c.id === companyId)?.name ?? "No company"
  }

  function handleChange(next: string | null) {
    if (next === CREATE) {
      setCreateOpen(true)
      return
    }
    if (!next || next === NONE) {
      onChange("", "")
      return
    }
    const company = comps?.find((c) => c.id === next)
    onChange(next, company?.name ?? "")
  }

  return (
    <>
      <Select value={value || NONE} onValueChange={handleChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(current: string) => labelFor(current)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No company</SelectItem>
          {(comps ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE}>
            <Plus />
            New company…
          </SelectItem>
        </SelectContent>
      </Select>

      <CompanyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(company) => {
          void mutate()
          onChange(company.id, company.name)
        }}
      />
    </>
  )
}
