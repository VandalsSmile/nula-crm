"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  onChange: (companyId: string, companyName: string, company?: Company) => void
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
    onChange(next, company?.name ?? "", company)
  }

  const all = comps ?? []
  // Group the newest companies at the top so a just-created one is easy to pick
  // among many similarly-named ones. Only partition once the list is long.
  const partition = all.length > 6
  const recent = partition
    ? [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
    : []
  const recentIds = new Set(recent.map((c) => c.id))
  const rest = partition ? all.filter((c) => !recentIds.has(c.id)) : all

  function itemContent(c: Company) {
    const loc = [c.city, c.state].filter(Boolean).join(", ")
    return (
      <span className="flex items-center gap-1.5">
        <span>{c.name}</span>
        {loc ? <span className="text-xs text-muted-foreground">· {loc}</span> : null}
      </span>
    )
  }

  return (
    <>
      <Select value={value || NONE} onValueChange={handleChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(current: string) => labelFor(current)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No company</SelectItem>
          {partition ? (
            <>
              <SelectGroup>
                <SelectLabel>Recently added</SelectLabel>
                {recent.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {itemContent(c)}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>All companies</SelectLabel>
                {rest.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {itemContent(c)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          ) : (
            rest.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {itemContent(c)}
              </SelectItem>
            ))
          )}
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
          onChange(company.id, company.name, company)
        }}
      />
    </>
  )
}
