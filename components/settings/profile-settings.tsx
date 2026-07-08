"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Loader2, Upload, Trash2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { updateUserProfile } from "@/app/actions/account"
import { initials } from "@/lib/mock-data"
import { useSessionUser } from "@/lib/session-context"

export function ProfileSettings() {
  const router = useRouter()
  const currentUser = useSessionUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(currentUser.name)
  const [phone, setPhone] = useState(currentUser.phone)
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle)
  const [image, setImage] = useState<string | null>(currentUser.image)
  const [savingName, setSavingName] = useState(false)
  const [uploading, setUploading] = useState(false)

  const nameDirty = name.trim() !== currentUser.name && name.trim().length > 0
  const profileDirty =
    nameDirty ||
    phone.trim() !== currentUser.phone ||
    jobTitle.trim() !== currentUser.jobTitle

  async function handleSaveName() {
    if (!profileDirty) return
    setSavingName(true)
    try {
      if (nameDirty) {
        const { error } = await authClient.updateUser({ name: name.trim() })
        if (error) throw new Error(error.message ?? "Could not save your name")
      }
      await updateUserProfile({ phone: phone.trim(), jobTitle: jobTitle.trim() })
      toast.success("Profile updated")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile")
    } finally {
      setSavingName(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/account/avatar", { method: "POST", body })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed")
      }

      const { error } = await authClient.updateUser({ image: data.url })
      if (error) throw new Error(error.message ?? "Could not update photo")

      setImage(data.url)
      toast.success("Photo updated")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update photo")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemovePhoto() {
    setUploading(true)
    const { error } = await authClient.updateUser({ image: "" })
    setUploading(false)
    if (error) {
      toast.error(error.message ?? "Could not remove photo")
      return
    }
    setImage(null)
    toast.success("Photo removed")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {image ? <AvatarImage src={image || "/placeholder.svg"} alt={currentUser.name} className="object-cover" /> : null}
            <AvatarFallback className="text-lg">{initials(name || currentUser.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
              {image ? "Change photo" : "Upload photo"}
            </Button>
            {image ? (
              <Button variant="ghost" onClick={handleRemovePhoto} disabled={uploading}>
                <Trash2 data-icon="inline-start" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" value={currentUser.email} disabled />
              <FieldDescription>Contact an admin to change your sign-in email.</FieldDescription>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="jobTitle">Job title</FieldLabel>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Owner"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Input id="role" value={currentUser.role} disabled />
            <FieldDescription>Your role is managed by a workspace admin.</FieldDescription>
          </Field>
        </FieldGroup>

        <div className="flex justify-end">
          <Button onClick={handleSaveName} disabled={!profileDirty || savingName}>
            {savingName ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
