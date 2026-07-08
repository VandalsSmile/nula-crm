"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Turnstile } from "@/components/turnstile"

type Status = "idle" | "submitting" | "success" | "error"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", company: "" })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the CAPTCHA below.")
      setStatus("error")
      return
    }

    setStatus("submitting")
    setError(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: captchaToken }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.")
        setStatus("error")
        return
      }

      setStatus("success")
    } catch {
      setError("Something went wrong. Please try again.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-8 text-center text-nula-ink shadow-xl shadow-nula-ink/10">
        <span className="flex size-12 items-center justify-center rounded-full bg-nula-signal/15">
          <CheckCircle2 className="size-6 text-[#0d8a75]" />
        </span>
        <h3 className="text-xl font-semibold">Thanks — we got your message!</h3>
        <p className="max-w-sm text-sm leading-relaxed text-nula-ink/65">
          A confirmation is on its way to your inbox, and someone from the Nula team will be in touch
          shortly.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex flex-col gap-4 rounded-3xl bg-white p-6 text-left text-nula-ink shadow-xl shadow-nula-ink/10 md:p-8"
    >
      <div>
        <h3 className="text-xl font-semibold">Send us a message</h3>
        <p className="mt-1 text-sm text-nula-ink/60">
          Tell us what you need and we&apos;ll get back to you at your email.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          name="name"
          value={form.name}
          onChange={update("name")}
          placeholder="Jane Doe"
          required
          autoComplete="name"
          disabled={status === "submitting"}
          className="h-10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="you@company.com"
            required
            autoComplete="email"
            disabled={status === "submitting"}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-phone">
            Phone <span className="font-normal text-nula-ink/40">(optional)</span>
          </Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="(555) 123-4567"
            autoComplete="tel"
            disabled={status === "submitting"}
            className="h-10"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message">How can we help?</Label>
        <Textarea
          id="contact-message"
          name="message"
          value={form.message}
          onChange={update("message")}
          placeholder="I'd love to learn how Nula can help my business…"
          required
          rows={4}
          disabled={status === "submitting"}
        />
      </div>

      {/* Honeypot — hidden from real users, catches bots. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.company}
          onChange={update("company")}
        />
      </div>

      {TURNSTILE_SITE_KEY ? (
        <Turnstile
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={(token) => {
            setCaptchaToken(token)
            setError(null)
          }}
          onExpire={() => setCaptchaToken(null)}
        />
      ) : null}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-1 w-full rounded-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send message"}
        {status !== "submitting" && <ArrowRight data-icon="inline-end" />}
      </Button>

      <p className="text-center text-xs text-nula-ink/45">
        We&apos;ll only use your details to reply to your message.
      </p>
    </form>
  )
}
