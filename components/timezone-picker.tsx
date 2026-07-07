"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  COMMON_TIMEZONES,
  formatTimezoneLabel,
  timezoneOptions,
} from "@/lib/timezones"

export function TimezonePicker({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const options = useMemo(() => timezoneOptions(value), [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((tz) => {
      const label = formatTimezoneLabel(tz).toLowerCase()
      return tz.toLowerCase().includes(q) || label.includes(q)
    })
  }, [options, query])

  const common = useMemo(
    () => COMMON_TIMEZONES.filter((tz) => filtered.includes(tz)),
    [filtered],
  )
  const other = useMemo(
    () => filtered.filter((tz) => !COMMON_TIMEZONES.includes(tz as (typeof COMMON_TIMEZONES)[number])),
    [filtered],
  )

  function select(tz: string) {
    onChange(tz)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        id={id}
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-8 w-full justify-between font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{value ? formatTimezoneLabel(value) : "Select timezone"}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--anchor-width)] min-w-72 p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search timezones…"
            autoFocus
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches</p>
            ) : (
              <>
                {common.length > 0 && !query.trim() ? (
                  <TimezoneGroup
                    label="Common"
                    zones={common}
                    value={value}
                    onSelect={select}
                  />
                ) : null}
                {other.length > 0 ? (
                  <TimezoneGroup
                    label={common.length > 0 && !query.trim() ? "All timezones" : undefined}
                    zones={other}
                    value={value}
                    onSelect={select}
                  />
                ) : null}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function TimezoneGroup({
  label,
  zones,
  value,
  onSelect,
}: {
  label?: string
  zones: string[]
  value: string
  onSelect: (tz: string) => void
}) {
  return (
    <div className="flex flex-col">
      {label ? (
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      {zones.map((tz) => {
        const selected = tz === value
        return (
          <button
            key={tz}
            type="button"
            onClick={() => onSelect(tz)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
              selected && "bg-accent",
            )}
          >
            <Check className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{formatTimezoneLabel(tz)}</span>
              <span className="truncate text-xs text-muted-foreground">{tz}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
