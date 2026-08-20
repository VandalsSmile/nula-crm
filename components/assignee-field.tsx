"use client"

import useSWR from "swr"

import { Field, FieldLabel } from "@/components/ui/field"
import { OwnerSelect } from "@/components/owner-select"
import { listTeamMembers, type TeamMember } from "@/app/actions/team"

/**
 * A labeled owner/assignee picker that hides itself for solo workspaces (one
 * member) — a single owner never needs to assign records, so the field just
 * adds confusion. When hidden, the record silently defaults to the acting user.
 */
export function AssigneeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (id: string) => void
}) {
  const { data: members } = useSWR<TeamMember[]>("team-members", listTeamMembers)
  // While loading (undefined) we hide it to avoid a flash; show only once we
  // know there's a real team (2+ members).
  if (!members || members.length <= 1) return null

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <OwnerSelect value={value} onChange={onChange} />
    </Field>
  )
}
