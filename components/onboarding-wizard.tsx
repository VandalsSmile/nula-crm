"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { updateUserProfile } from "@/app/actions/account"
import { updateWorkspaceSettings } from "@/app/actions/workspace"
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE, type BusinessTypeId } from "@/lib/crm-defaults"
import { APP_ROUTES } from "@/lib/routes"

export function OnboardingWizard({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — your profile
  const [name, setName] = useState(initialName)
  const [jobTitle, setJobTitle] = useState("")
  const [phone, setPhone] = useState("")

  // Step 2 — company profile
  const [companyName, setCompanyName] = useState("")
  const [businessType, setBusinessType] = useState<BusinessTypeId>(DEFAULT_BUSINESS_TYPE)
  const [website, setWebsite] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [supportEmail, setSupportEmail] = useState("")

  function goNext() {
    if (!name.trim()) {
      toast.error("Please enter your name")
      return
    }
    setStep(2)
  }

  async function handleFinish() {
    if (!companyName.trim()) {
      toast.error("Please enter your business name")
      return
    }
    setSaving(true)
    try {
      if (name.trim() && name.trim() !== initialName) {
        await authClient.updateUser({ name: name.trim() })
      }
      await updateUserProfile({ phone: phone.trim(), jobTitle: jobTitle.trim() })
      await updateWorkspaceSettings({
        businessType,
        companyName: companyName.trim(),
        website: website.trim(),
        phone: companyPhone.trim(),
        supportEmail: supportEmail.trim(),
      })
      toast.success("You're all set!")
      router.push(APP_ROUTES.dashboard)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish setup")
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center marketing-warm-bg p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight text-nula-ink">Nula CRM</span>
      </div>

      <Card className="w-full max-w-md rounded-2xl border-border/60 shadow-lg shadow-nula-violet/8">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <StepDot active={step === 1} done={step > 1} label="1" />
            <span className="h-px flex-1 bg-border" />
            <StepDot active={step === 2} done={false} label="2" />
          </div>
          <CardTitle className="text-xl">
            {step === 1 ? "Tell us about you" : "Tell us about your business"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "This helps your team know who's who."
              : "We'll tailor tags, groups, and suggestions to your industry."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ob-name">Full name</FieldLabel>
                <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ob-title">Job title</FieldLabel>
                  <Input
                    id="ob-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Owner"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ob-phone">Phone</FieldLabel>
                  <Input
                    id="ob-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </Field>
              </div>
              <Button className="w-full rounded-full" onClick={goNext}>
                Continue
                <ArrowRight data-icon="inline-end" />
              </Button>
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ob-company">Business name</FieldLabel>
                <Input
                  id="ob-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Co."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ob-industry">Industry</FieldLabel>
                <Select value={businessType} onValueChange={(v) => v && setBusinessType(v as BusinessTypeId)}>
                  <SelectTrigger id="ob-industry">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ob-website">Website</FieldLabel>
                  <Input
                    id="ob-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ob-cphone">Business phone</FieldLabel>
                  <Input
                    id="ob-cphone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="ob-support">Support email</FieldLabel>
                <Input
                  id="ob-support"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="hello@example.com"
                />
              </Field>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setStep(1)} disabled={saving}>
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                <Button className="flex-1 rounded-full" onClick={handleFinish} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                  Finish setup
                </Button>
              </div>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={
        "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium " +
        (done || active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
      }
    >
      {done ? <Check className="size-4" /> : label}
    </span>
  )
}
