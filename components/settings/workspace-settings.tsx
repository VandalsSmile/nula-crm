"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getWorkspaceSettingsInfo, updateWorkspaceSettings } from "@/app/actions/workspace"
import { BUSINESS_TYPES, type BusinessTypeId } from "@/lib/crm-defaults"
import { useSessionUser } from "@/lib/session-context"

export function WorkspaceSettings() {
  const me = useSessionUser()
  const isAdmin = me.role === "Admin"
  const { data, isLoading, mutate } = useSWR("workspace-settings", () => getWorkspaceSettingsInfo())
  const [selected, setSelected] = useState<BusinessTypeId | "">("")
  const [saving, setSaving] = useState(false)

  const current = (selected || data?.businessType || "iv-therapy") as BusinessTypeId

  async function handleSave() {
    setSaving(true)
    try {
      await updateWorkspaceSettings({ businessType: current })
      toast.success("Workspace settings saved")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business type</CardTitle>
        <CardDescription>
          Sets the default tags, groups, and campaign suggestions Nula uses for your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field className="sm:max-w-sm">
          <FieldLabel htmlFor="business-type">Industry</FieldLabel>
          <Select
            value={current}
            onValueChange={(v) => v && setSelected(v as BusinessTypeId)}
            disabled={!isAdmin || isLoading}
          >
            <SelectTrigger id="business-type">
              <SelectValue>
                {(value) => BUSINESS_TYPES.find((b) => b.id === value)?.label ?? "Select industry"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {isAdmin
              ? "Changing this won't remove existing tags or groups."
              : "Only admins can change the business type."}
          </FieldDescription>
        </Field>
        {isAdmin ? (
          <Button className="w-fit" onClick={handleSave} disabled={saving || isLoading}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
