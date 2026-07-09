"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, MailCheck } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"
import { APP_ROUTES } from "@/lib/routes"

export function ForgotPasswordPanel() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    })
    setLoading(false)
    if (error) {
      setError(error.message ?? "Could not send the reset email.")
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center marketing-warm-bg p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight text-nula-ink">Nula CRM</span>
      </div>
      <Card className="w-full max-w-sm rounded-2xl border-border/60 shadow-lg shadow-nula-violet/8">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{sent ? "Check your email" : "Reset your password"}</CardTitle>
          <CardDescription>
            {sent
              ? `If an account exists for ${email}, a reset link is on its way.`
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <MailCheck className="size-8 text-nula-signal" />
              <p className="text-sm text-nula-ink/65">
                The link expires in 1 hour. Didn&apos;t get it? Check spam, or try again.
              </p>
              <Button variant="outline" className="w-full rounded-full" onClick={() => setSent(false)}>
                Try another email
              </Button>
              <Link href={APP_ROUTES.login} className="text-sm font-medium text-nula-violet hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Work email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </Field>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full rounded-full" disabled={loading || !email.trim()}>
                  {loading ? "Sending..." : "Send reset link"}
                  {!loading && <ArrowRight data-icon="inline-end" />}
                </Button>
                <p className="text-center text-sm text-nula-ink/60">
                  Remembered it?{" "}
                  <Link href={APP_ROUTES.login} className="font-medium text-nula-violet hover:underline">
                    Sign in
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
