"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { listContactOptions } from "@/app/actions/contacts"
import { cn } from "@/lib/utils"

type ContactOption = { id: string; name: string; email: string }

export function ContactSelect({
  value,
  onChange,
  id,
  placeholder = "No contact",
}: {
  value: string
  onChange: (contactId: string) => void
  id?: string
  placeholder?: string
}) {
  const { data } = useSWR<ContactOption[]>("contact-options", () => listContactOptions())
  const contacts = useMemo<ContactOption[]>(() => data ?? [], [data])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = contacts.find((c) => c.id === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? contacts.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q))
      : contacts
    return list.slice(0, 50)
  }, [contacts, query])

  function pick(contactId: string) {
    onChange(contactId)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b p-2">
          <Input
            autoFocus
            placeholder="Search contacts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => pick("")}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            <span className="text-muted-foreground">No contact</span>
            {!value ? <Check className="size-4" /> : null}
          </button>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                {c.email ? (
                  <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                ) : null}
              </span>
              {value === c.id ? <Check className="size-4 shrink-0" /> : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">No contacts found.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
