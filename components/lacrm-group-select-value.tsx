"use client"

import { SelectValue } from "@/components/ui/select"
import type { LacrmGroupOption } from "@/app/actions/lacrm"
import { lacrmGroupSelectLabel } from "@/lib/lacrm-group-label"

export function LacrmGroupSelectValue({
  groups,
  placeholder = "Select a group",
}: {
  groups: LacrmGroupOption[]
  placeholder?: string
}) {
  return (
    <SelectValue placeholder={placeholder}>
      {(value) => lacrmGroupSelectLabel(groups, value, placeholder)}
    </SelectValue>
  )
}
