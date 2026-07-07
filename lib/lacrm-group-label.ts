import type { LacrmGroupOption } from "@/app/actions/lacrm"

/** Human-readable label for a LACRM group (name + optional contact count). */
export function lacrmGroupLabel(group: LacrmGroupOption): string {
  return typeof group.contactCount === "number"
    ? `${group.name} (${group.contactCount})`
    : group.name
}

/** Resolve a group id to its display label for select triggers. */
export function lacrmGroupSelectLabel(
  groups: LacrmGroupOption[],
  value: string | null,
  placeholder = "Select a group",
): string {
  if (!value) return placeholder
  const group = groups.find((entry) => entry.id === value)
  if (!group) return placeholder
  return lacrmGroupLabel(group)
}
