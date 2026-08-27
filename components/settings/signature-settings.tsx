"use client"

import { useRef, useState } from "react"
import useSWR from "swr"
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { getMySignature, updateMySignature, type SignatureInfo } from "@/app/actions/signature"

export function SignatureSettings() {
  const { data, isLoading, mutate } = useSWR<SignatureInfo>("my-signature", () => getMySignature())
  const [edits, setEdits] = useState<Partial<SignatureInfo>>({})
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const text = (field: keyof SignatureInfo): string => (edits[field] ?? data?.[field] ?? "") as string
  const setField = <K extends keyof SignatureInfo>(field: K, value: SignatureInfo[K]) =>
    setEdits((prev) => ({ ...prev, [field]: value }))

  const enabled = (edits.enabled ?? data?.enabled ?? true) as boolean
  const logoUrl = text("logoUrl")
  const logoWidth = (edits.logoWidth ?? data?.logoWidth ?? 0) as number
  const logoHeight = (edits.logoHeight ?? data?.logoHeight ?? 0) as number
  const dirty = Object.keys(edits).length > 0

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setLogoBusy(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/signature/logo", { method: "POST", body })
      const d = (await res.json()) as { url?: string; width?: number; height?: number; error?: string }
      if (!res.ok || !d.url) throw new Error(d.error ?? "Upload failed")
      setEdits((prev) => ({
        ...prev,
        logoUrl: d.url,
        logoWidth: d.width ?? 0,
        logoHeight: d.height ?? 0,
      }))
      toast.success("Logo uploaded — remember to Save")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload logo")
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateMySignature({ ...edits, enabled })
      toast.success("Signature saved")
      setEdits({})
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save signature")
    } finally {
      setSaving(false)
    }
  }

  const preview = {
    fullName: text("fullName"),
    title: text("title"),
    company: text("company"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    tagline: text("tagline"),
  }
  const roleLine = [preview.title, preview.company].filter(Boolean).join(", ")
  const contactLine = [preview.phone, preview.email, preview.website].filter(Boolean).join("  •  ")
  const hasPreview = Boolean(
    preview.fullName || roleLine || contactLine || preview.tagline || logoUrl,
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Email signature</CardTitle>
          <CardDescription>
            Your personal signature is added to every email you send to contacts from Nula.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={(v) => setField("enabled", v)}
              aria-label="Enable signature"
              disabled={isLoading}
            />
            <span className="text-sm text-muted-foreground">
              {enabled ? "On — appended to emails you send" : "Off"}
            </span>
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Logo</p>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Signature logo" className="size-full object-contain" />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoFile}
                />
                <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={logoBusy || isLoading}>
                  {logoBusy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                  {logoUrl ? "Change logo" : "Upload logo"}
                </Button>
                {logoUrl ? (
                  <Button
                    variant="ghost"
                    onClick={() => setEdits((prev) => ({ ...prev, logoUrl: "", logoWidth: 0, logoHeight: 0 }))}
                    disabled={logoBusy}
                  >
                    <Trash2 data-icon="inline-start" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <FieldDescription>
              PNG, JPG, WEBP, GIF, or SVG up to 4MB. Logos are automatically resized to a
              consistent size (max 180×48px) so they look right in every email client.
            </FieldDescription>
          </div>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sig-name">Full name</FieldLabel>
                <Input id="sig-name" value={text("fullName")} onChange={(e) => setField("fullName", e.target.value)} placeholder="Jane Doe" disabled={isLoading} />
              </Field>
              <Field>
                <FieldLabel htmlFor="sig-title">Title</FieldLabel>
                <Input id="sig-title" value={text("title")} onChange={(e) => setField("title", e.target.value)} placeholder="Account Manager" disabled={isLoading} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sig-company">Company</FieldLabel>
                <Input id="sig-company" value={text("company")} onChange={(e) => setField("company", e.target.value)} placeholder="Acme Co." disabled={isLoading} />
              </Field>
              <Field>
                <FieldLabel htmlFor="sig-phone">Phone</FieldLabel>
                <Input id="sig-phone" type="tel" value={text("phone")} onChange={(e) => setField("phone", e.target.value)} placeholder="(555) 123-4567" disabled={isLoading} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sig-email">Email</FieldLabel>
                <Input id="sig-email" type="email" value={text("email")} onChange={(e) => setField("email", e.target.value)} placeholder="jane@acme.com" disabled={isLoading} />
              </Field>
              <Field>
                <FieldLabel htmlFor="sig-website">Website</FieldLabel>
                <Input id="sig-website" value={text("website")} onChange={(e) => setField("website", e.target.value)} placeholder="acme.com" disabled={isLoading} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="sig-tagline">Tagline (optional)</FieldLabel>
              <Input id="sig-tagline" value={text("tagline")} onChange={(e) => setField("tagline", e.target.value)} placeholder="Helping small businesses grow" disabled={isLoading} />
            </Field>
          </FieldGroup>

          <Button className="w-fit" onClick={handleSave} disabled={saving || isLoading || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save signature
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>How your signature appears at the bottom of your emails.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasPreview ? (
            <div className="border-t pt-3 text-sm leading-relaxed">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  {...(logoWidth && logoHeight ? { width: logoWidth, height: logoHeight } : {})}
                  className="mb-2 max-h-12 max-w-[180px] object-contain object-left"
                />
              ) : null}
              {preview.fullName ? <div className="font-semibold text-foreground">{preview.fullName}</div> : null}
              {roleLine ? <div className="text-muted-foreground">{roleLine}</div> : null}
              {contactLine ? <div className="text-nula-violet">{contactLine}</div> : null}
              {preview.tagline ? <div className="mt-1 text-xs text-muted-foreground">{preview.tagline}</div> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Fill in your details above to see your signature preview.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
