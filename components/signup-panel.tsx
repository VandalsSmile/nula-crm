"use client"

import Link from "next/link"
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

export function SignupPanel() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await authClient.signUp.email({
      email: email.trim(),
      password,
      name: name.trim() || email.split("@")[0],
    })

    if (error) {
      setLoading(false)
      setError(error.message ?? "Could not create your account")
      return
    }

    // New self-serve accounts own a fresh workspace — send them to onboarding
    // to set up their profile and company before entering the app.
    router.push(APP_ROUTES.onboarding)
    router.refresh()
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#5c4de8] via-nula-violet to-[#2a1f6e] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 top-20 size-72 rounded-full bg-nula-signal/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <Logo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">Nula CRM</span>
        </div>
        <div className="relative flex flex-col gap-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
            Start managing customers the easy way.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-white/85">
            Create your free workspace in seconds. We&apos;ll help you set up your business and get
            your first contacts in.
          </p>
        </div>
        <p className="relative text-sm text-white/60">
          A better, easier way to manage customers for small business
        </p>
      </div>

      {/* Sign-up form */}
      <div className="flex flex-1 flex-col items-center justify-center marketing-warm-bg p-4 sm:p-6">
        <div className="mb-4 w-full max-w-sm lg:hidden">
          <Link href="/" className="text-sm font-medium text-nula-ink/60 transition-colors hover:text-nula-violet">
            ← Back to Nula CRM
          </Link>
        </div>
        <Card className="w-full max-w-sm rounded-2xl border-border/60 shadow-lg shadow-nula-violet/8">
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-2 size-11 lg:hidden" />
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>Set up your free Nula CRM workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    autoComplete="name"
                  />
                </Field>
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
                      autoComplete="new-password"
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
                  <FieldDescription>At least 8 characters.</FieldDescription>
                </Field>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? "Creating your account..." : "Create account"}
                  {!loading && <ArrowRight data-icon="inline-end" />}
                </Button>

                <p className="text-center text-sm text-nula-ink/60">
                  Already have an account?{" "}
                  <Link href={APP_ROUTES.login} className="font-medium text-nula-violet hover:underline">
                    Sign in
                  </Link>
                </p>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
