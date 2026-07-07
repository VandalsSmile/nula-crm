"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export function SecuritySettings() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  const canSubmit =
    current.length > 0 && next.length >= 8 && confirm.length > 0 && !saving

  async function handleChangePassword() {
    if (next !== confirm) {
      toast.error("New passwords do not match")
      return
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }

    setSaving(true)
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    })
    setSaving(false)

    if (error) {
      toast.error(error.message ?? "Could not change password")
      return
    }

    toast.success("Password changed. Other sessions were signed out.")
    setCurrent("")
    setNext("")
    setConfirm("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your password. This signs out any other active sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <FieldDescription>Use at least 8 characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
        <div className="flex justify-end">
          <Button onClick={handleChangePassword} disabled={!canSubmit}>
            {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            Update password
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
