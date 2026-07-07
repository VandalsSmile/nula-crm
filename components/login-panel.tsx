"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"

import { APP_ROUTES } from "@/lib/routes"

export function LoginPanel({ callbackURL = APP_ROUTES.dashboard }: { callbackURL?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Something went wrong")
      return
    }

    router.push(callbackURL)
    router.refresh()
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">Nula CRM</span>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
            Tell the CRM what you want done.
          </h1>
          <p className="max-w-md text-lg text-primary-foreground/80">
            It organizes your data, suggests the right next move, and helps you execute it safely.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">AI-first CRM for growing businesses</p>
      </div>

      {/* Auth form */}
      <div className="flex flex-1 items-center justify-center bg-nula-paper p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-2 size-11 lg:hidden" />
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your Nula CRM workspace</CardDescription>
          </CardHeader>
          <CardContent>
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
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FieldDescription>Invite-only access for your workspace team.</FieldDescription>
                </Field>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : "Sign in"}
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
