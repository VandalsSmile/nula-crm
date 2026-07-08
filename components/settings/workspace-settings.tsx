"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCompanyProfile,
  updateWorkspaceSettings,
  type CompanyProfile,
} from "@/app/actions/workspace"
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE, type BusinessTypeId } from "@/lib/crm-defaults"
import { useSessionUser } from "@/lib/session-context"

export function WorkspaceSettings() {
  const me = useSessionUser()
  const isAdmin = me.role === "Admin"
  const { data, isLoading, mutate } = useSWR("company-profile", () => getCompanyProfile())
  const [edits, setEdits] = useState<Partial<CompanyProfile>>({})
  const [saving, setSaving] = useState(false)

  function text(field: keyof CompanyProfile): string {
    return (edits[field] ?? data?.[field] ?? "") as string
  }
  function setField<K extends keyof CompanyProfile>(field: K, value: CompanyProfile[K]) {
    setEdits((prev) => ({ ...prev, [field]: value }))
  }

  const businessType = (edits.businessType ?? data?.businessType ?? DEFAULT_BUSINESS_TYPE) as BusinessTypeId
  const dirty = Object.keys(edits).length > 0

  async function handleSave() {
    setSaving(true)
    try {
      await updateWorkspaceSettings(edits)
      toast.success("Company profile saved")
      setEdits({})
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save company profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
        <CardDescription>
          Your business details. The industry sets the default tags, groups, and campaign
          suggestions Nula uses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="company-name">Business name</FieldLabel>
              <Input
                id="company-name"
                value={text("companyName")}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="Acme Co."
                disabled={!isAdmin || isLoading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="business-type">Industry</FieldLabel>
              <Select
                value={businessType}
                onValueChange={(v) => v && setField("businessType", v as BusinessTypeId)}
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
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="company-website">Website</FieldLabel>
              <Input
                id="company-website"
                value={text("website")}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://example.com"
                disabled={!isAdmin || isLoading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-phone">Phone</FieldLabel>
              <Input
                id="company-phone"
                type="tel"
                value={text("phone")}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={!isAdmin || isLoading}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="company-email">Support email</FieldLabel>
              <Input
                id="company-email"
                type="email"
                value={text("supportEmail")}
                onChange={(e) => setField("supportEmail", e.target.value)}
                placeholder="hello@example.com"
                disabled={!isAdmin || isLoading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-timezone">Timezone</FieldLabel>
              <Input
                id="company-timezone"
                value={text("timezone")}
                onChange={(e) => setField("timezone", e.target.value)}
                placeholder="America/New_York"
                disabled={!isAdmin || isLoading}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="company-address">Address</FieldLabel>
            <Input
              id="company-address"
              value={text("address")}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="123 Main St, Springfield"
              disabled={!isAdmin || isLoading}
            />
            <FieldDescription>
              {isAdmin
                ? "Used across your workspace for defaults and outreach context."
                : "Only admins can edit the company profile."}
            </FieldDescription>
          </Field>
        </FieldGroup>

        {isAdmin ? (
          <Button className="w-fit" onClick={handleSave} disabled={saving || isLoading || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
