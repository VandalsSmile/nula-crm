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
import { APP_ROUTES } from "@/lib/routes"

type AcceptMode = "signed-in" | "wrong-account" | "sign-in" | "sign-up"

export function AcceptInvitePanel({
  token,
  email,
  invitedByName,
  mode = "sign-up",
  signedInEmail = "",
}: {
  token: string
  email: string
  invitedByName: string
  mode?: AcceptMode
  signedInEmail?: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const invitedBy = invitedByName?.trim()

  function goToApp() {
    router.push(APP_ROUTES.dashboard)
    router.refresh()
  }

  /** Bind the (now signed-in) account to the inviting workspace. */
  async function finishAccept(): Promise<boolean> {
    try {
      await acceptTeamInvite(token)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the invite.")
      return false
    }
  }

  // Create a brand-new account, then accept.
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
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
    const ok = await finishAccept()
    setLoading(false)
    if (ok) goToApp()
  }

  // Sign in to an existing account (e.g. a previously-removed teammate), then accept.
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await authClient.signIn.email({ email, password })
    if (signInError) {
      setLoading(false)
      setError(signInError.message ?? "Could not sign you in. Check your password.")
      return
    }
    const ok = await finishAccept()
    setLoading(false)
    if (ok) goToApp()
  }

  // Already signed in as the invited email — one click to join.
  async function handleJoin() {
    setError(null)
    setLoading(true)
    const ok = await finishAccept()
    setLoading(false)
    if (ok) goToApp()
  }

  // Signed in as someone else — sign out so they can accept as the invited email.
  async function handleSwitchAccount() {
    setLoading(true)
    try {
      await authClient.signOut()
    } finally {
      // Reload so the page re-evaluates the (now signed-out) session.
      router.refresh()
      setLoading(false)
    }
  }

  function renderBody() {
    if (mode === "signed-in") {
      return (
        <>
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-2 size-11 lg:hidden" />
            <CardTitle className="text-xl">Accept your invite</CardTitle>
            <CardDescription>
              {invitedBy ? `${invitedBy} invited you. ` : ""}You&apos;re signed in as{" "}
              <span className="font-medium">{email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="button" className="w-full" disabled={loading} onClick={handleJoin}>
                {loading ? "Joining…" : "Join the team"}
                {!loading && <ArrowRight data-icon="inline-end" />}
              </Button>
            </FieldGroup>
          </CardContent>
        </>
      )
    }

    if (mode === "wrong-account") {
      return (
        <>
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-2 size-11 lg:hidden" />
            <CardTitle className="text-xl">Switch accounts to join</CardTitle>
            <CardDescription>
              This invite is for <span className="font-medium">{email}</span>, but you&apos;re signed
              in as <span className="font-medium">{signedInEmail}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FieldDescription>
                Sign out and sign back in as {email} to accept this invite.
              </FieldDescription>
              <Button type="button" className="w-full" disabled={loading} onClick={handleSwitchAccount}>
                {loading ? "Signing out…" : "Sign out"}
              </Button>
            </FieldGroup>
          </CardContent>
        </>
      )
    }

    if (mode === "sign-in") {
      return (
        <>
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-2 size-11 lg:hidden" />
            <CardTitle className="text-xl">Accept your invite</CardTitle>
            <CardDescription>
              {invitedBy ? `${invitedBy} invited you. ` : ""}Sign in to join this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Work email</FieldLabel>
                  <Input id="email" type="email" value={email} readOnly disabled autoComplete="email" />
                  <FieldDescription>This invite is tied to your email address.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <FieldDescription>
                    Use your existing Nula password.{" "}
                    <a href={APP_ROUTES.login} className="underline hover:text-foreground">
                      Forgot it?
                    </a>
                  </FieldDescription>
                </Field>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in & join"}
                  {!loading && <ArrowRight data-icon="inline-end" />}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </>
      )
    }

    // mode === "sign-up"
    return (
      <>
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-2 size-11 lg:hidden" />
          <CardTitle className="text-xl">Accept your invite</CardTitle>
          <CardDescription>
            {invitedBy ? `${invitedBy} invited you. ` : ""}Create your password to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
      </>
    )
  }

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
            Client management, simplified.
          </h1>
          {invitedBy && (
            <p className="text-base text-primary-foreground/80 text-pretty">
              {invitedBy} invited you to join the Nula CRM workspace.
            </p>
          )}
        </div>
        <p className="text-sm text-primary-foreground/60">Nula CRM</p>
      </div>

      {/* Action card */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">{renderBody()}</Card>
      </div>
    </div>
  )
}
