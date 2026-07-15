"use client"

import useSWR from "swr"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listTeamMembers, type TeamMember } from "@/app/actions/team"

const UNASSIGNED = "unassigned"

/**
 * Picks the workspace member who owns a record. Emits "" for unassigned.
 * Renders member names (not raw ids) in the trigger via SelectValue's function
 * form, since the stored value is a user id.
 */
export function OwnerSelect({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (ownerId: string) => void
  id?: string
}) {
  const { data: members } = useSWR<TeamMember[]>("team-members", listTeamMembers)

  function labelFor(ownerId: string) {
    if (!ownerId || ownerId === UNASSIGNED) return "Unassigned"
    const member = members?.find((m) => m.id === ownerId)
    if (!member) return "Unassigned"
    return `${member.name}${member.isYou ? " (you)" : ""}`
  }

  return (
    <Select
      value={value || UNASSIGNED}
      onValueChange={(next) => onChange(next === UNASSIGNED ? "" : next ?? "")}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue>{(current: string) => labelFor(current)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {(members ?? []).map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
            {m.isYou ? " (you)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
