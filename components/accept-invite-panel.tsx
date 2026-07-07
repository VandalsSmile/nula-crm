"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"
import { acceptTeamInvite } from "@/app/actions/team"

export function AcceptInvitePanel({
  token,
  email,
  invitedByName,
}: {
  token: string
  email: string
  invitedByName: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // 1. Create the account. Better Auth's invite-only hook allows this because
    //    the email has a pending invite, and autoSignIn establishes a session.
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: name.trim() || email.split("@")[0],
    })
    if (signUpError) {
      setLoading(false)
      setError(signUpError.message ?? "Could not create your account.")
      return
    }

    // 2. Bind the new account to the inviting workspace and close the invite.
    try {
      await acceptTeamInvite(token)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : "Could not accept the invite.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  const invitedBy = invitedByName?.trim()

  return (
    <div className="flex min-h-svh flex-col bg-muted/40 lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">NULA CRM</span>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
            {"Spackle: AI the sh%$ out of it!"}
          </h1>
          {invitedBy && (
            <p className="text-base text-primary-foreground/80 text-pretty">
              {invitedBy} invited you to join the team workspace.
            </p>
          )}
        </div>
        <p className="text-sm text-primary-foreground/60">VS Marketing internal tool</p>
      </div>

      {/* Sign-up form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-2 size-11 lg:hidden" />
            <CardTitle className="text-xl">Accept your invite</CardTitle>
            <CardDescription>
              {invitedBy ? `${invitedBy} invited you. ` : ""}Create your password to join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Work email</FieldLabel>
                  <Input id="email" type="email" value={email} readOnly disabled autoComplete="email" />
                  <FieldDescription>This invite is tied to your email address.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Create a password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <FieldDescription>At least 8 characters.</FieldDescription>
                </Field>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating your account..." : "Join the team"}
                  {!loading && <ArrowRight data-icon="inline-end" />}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
