"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { createClient, fetchBrandFromUrl } from "@/app/actions/clients"
import { BrandImport } from "@/components/brand-import"

export function AddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [colors, setColors] = useState<string[]>([])
  const [accentColor, setAccentColor] = useState<string | null>(null)

  function reset() {
    setName("")
    setWebsite("")
    setContactEmail("")
    setPhone("")
    setLocation("")
    setLogoUrl(null)
    setColors([])
    setAccentColor(null)
  }

  async function fetchBrand() {
    if (!website.trim()) {
      toast.error("Enter a website URL first")
      return
    }
    setFetching(true)
    try {
      const result = await fetchBrandFromUrl(website.trim())
      setLogoUrl(result.logoUrl)
      setColors(result.colors)
      if (result.colors[0]) setAccentColor(result.colors[0])
      if (!name.trim() && result.suggestedName) setName(result.suggestedName)
      toast.success("Brand imported")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import brand")
    } finally {
      setFetching(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Client name is required")
      return
    }
    setSaving(true)
    try {
      await createClient({
        name: name.trim(),
        websiteUrl: website.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        location: location.trim(),
        logoUrl,
        accentColor: accentColor ?? undefined,
      })
      toast.success("Client created")
      reset()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create client")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>Create a new client profile in your workspace.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="client-name">Client name</FieldLabel>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="client-website">Website</FieldLabel>
            <div className="flex gap-2">
              <Input id="client-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              <Button type="button" variant="outline" onClick={fetchBrand} disabled={fetching}>
                {fetching ? <Loader2 className="animate-spin" /> : <Download />}
              </Button>
            </div>
          </Field>
          <BrandImport logoUrl={logoUrl} colors={colors} accentColor={accentColor} onSelectAccent={setAccentColor} />
          <Field>
            <FieldLabel htmlFor="client-email">Contact email</FieldLabel>
            <Input id="client-email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="client-phone">Phone</FieldLabel>
            <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="client-location">Location</FieldLabel>
            <Input id="client-location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
            Create client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
