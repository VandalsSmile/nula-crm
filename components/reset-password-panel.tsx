"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"
import { APP_ROUTES } from "@/lib/routes"

export function ResetPasswordPanel() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.")
      return
    }
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (error) {
      setError(error.message ?? "Could not reset your password. The link may have expired.")
      return
    }
    setDone(true)
    setTimeout(() => {
      router.push(APP_ROUTES.login)
      router.refresh()
    }, 1500)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center marketing-warm-bg p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight text-nula-ink">Nula CRM</span>
      </div>
      <Card className="w-full max-w-sm rounded-2xl border-border/60 shadow-lg shadow-nula-violet/8">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Choose a new password</CardTitle>
          <CardDescription>
            {done ? "Password updated — redirecting you to sign in." : "Enter a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-nula-ink/65">
                This reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-nula-violet hover:underline"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new-password">New password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={done}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
                      aria-label={show ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FieldDescription>At least 8 characters.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={done}
                  />
                </Field>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full rounded-full" disabled={loading || done}>
                  {done ? "Password updated" : loading ? "Updating..." : "Update password"}
                  {!loading && !done && <ArrowRight data-icon="inline-end" />}
                </Button>
                <p className="text-center text-sm text-nula-ink/60">
                  <Link href={APP_ROUTES.login} className="font-medium text-nula-violet hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
