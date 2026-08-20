"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Plus,
  Rocket,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/rich-text-editor"
import { CampaignSendHistory } from "./campaign-send-history"
import {
  approveCampaign,
  launchCampaign,
  renderCampaignPreview,
  updateCampaign,
} from "@/app/actions/campaigns"
import { APP_ROUTES } from "@/lib/routes"
import { campaignStatusLabel, type Campaign, type CampaignStep, type Group } from "@/lib/crm-types"

type Editable = {
  subject: string
  body: string
  featuredImageUrl: string
  delayDays: number
}

function toEditable(steps: CampaignStep[]): Editable[] {
  const list = (steps ?? []).map((s) => ({
    subject: s.subject ?? "",
    body: s.body ?? "",
    featuredImageUrl: s.featuredImageUrl ?? "",
    delayDays: Math.max(0, Math.round(Number(s.delayDays ?? 0))),
  }))
  return list.length ? list : [{ subject: "", body: "", featuredImageUrl: "", delayDays: 0 }]
}

export function CampaignEditor({ campaign, groups }: { campaign: Campaign; groups: Group[] }) {
  const router = useRouter()
  const [name, setName] = useState(campaign.name)
  const [groupId, setGroupId] = useState(campaign.groupId ?? "")
  const [kind, setKind] = useState<Campaign["kind"]>(campaign.kind)
  const [emails, setEmails] = useState<Editable[]>(() => toEditable(campaign.sequence))
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewHtml, setPreviewHtml] = useState("")
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const isSequence = kind === "sequence"
  const visibleEmails = isSequence ? emails : emails.slice(0, 1)

  function updateEmail(index: number, patch: Partial<Editable>) {
    setEmails((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)))
  }

  function addEmail() {
    setEmails((prev) => [...prev, { subject: "", body: "", featuredImageUrl: "", delayDays: 3 }])
  }

  function removeEmail(index: number) {
    setEmails((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    setPreviewIndex(0)
  }

  function toggleKind(next: Campaign["kind"]) {
    if (next === "broadcast" && emails.length > 1) {
      if (!confirm("Switch to a one-time email? Only the first email will be kept.")) return
      setEmails((prev) => prev.slice(0, 1))
      setPreviewIndex(0)
    }
    setKind(next)
  }

  async function handleUpload(index: number, file: File) {
    setUploadingIndex(index)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/campaigns/image", { method: "POST", body: fd })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed")
      updateEmail(index, { featuredImageUrl: data.url })
      toast.success("Image uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingIndex(null)
    }
  }

  const refreshPreview = useCallback(async () => {
    const email = (kind === "sequence" ? emails : emails.slice(0, 1))[previewIndex] ?? emails[0]
    if (!email) return
    try {
      const { html } = await renderCampaignPreview({
        subject: email.subject,
        body: email.body,
        featuredImageUrl: email.featuredImageUrl,
      })
      setPreviewHtml(html)
    } catch {
      // ignore preview errors
    }
  }, [emails, kind, previewIndex])

  // Debounced live preview as the active email changes.
  useEffect(() => {
    const handle = setTimeout(refreshPreview, 600)
    return () => clearTimeout(handle)
  }, [refreshPreview])

  async function save(): Promise<boolean> {
    if (!name.trim()) {
      toast.error("Campaign name is required")
      return false
    }
    setSaving(true)
    try {
      const sequence: CampaignStep[] = (isSequence ? emails : emails.slice(0, 1)).map((e, i) => ({
        step: i + 1,
        channel: "email",
        subject: e.subject,
        body: e.body,
        featuredImageUrl: e.featuredImageUrl,
        delayDays: i === 0 ? 0 : e.delayDays,
      }))
      await updateCampaign(campaign.id, {
        name,
        kind,
        groupId: groupId || null,
        sequence,
      })
      toast.success("Campaign saved")
      router.refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save campaign")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!(await save())) return
    setBusy(true)
    try {
      await approveCampaign(campaign.id)
      toast.success("Submitted for approval")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleLaunch() {
    if (!groupId) {
      toast.error("Pick a target group before launching")
      return
    }
    if (!(await save())) return
    setBusy(true)
    try {
      const result = await launchCampaign(campaign.id)
      toast.success(result.message)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Launch failed")
    } finally {
      setBusy(false)
    }
  }

  const launchable =
    campaign.status === "draft" ||
    campaign.status === "pending_approval" ||
    campaign.status === "scheduled"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href={APP_ROUTES.campaigns} />} aria-label="Back to campaigns">
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{name || "Untitled campaign"}</h1>
              <Badge variant={isSequence ? "default" : "secondary"}>
                {isSequence ? "Sequence" : "One-time email"}
              </Badge>
              <Badge variant="outline">{campaignStatusLabel(campaign.status)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isSequence
                ? "A drip of several emails sent over days."
                : "A single email sent once to your audience."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={save} disabled={saving || busy}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
          {campaign.status === "draft" ? (
            <Button variant="outline" onClick={handleApprove} disabled={saving || busy}>
              Submit for approval
            </Button>
          ) : null}
          {launchable ? (
            <Button onClick={handleLaunch} disabled={saving || busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
              Launch
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Editor column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring reactivation" />
                <FieldDescription>Internal name — not shown to recipients.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select value={kind} onValueChange={(v) => toggleKind(v as Campaign["kind"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">One-time email (send once)</SelectItem>
                    <SelectItem value="sequence">Sequence (multiple emails over time)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Send to group</FieldLabel>
                <Select value={groupId || "__none__"} onValueChange={(v) => setGroupId(v && v !== "__none__" ? v : "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No group yet</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Contacts in this group receive the campaign (opted-out contacts are skipped).</FieldDescription>
              </Field>
            </CardContent>
          </Card>

          {visibleEmails.map((email, i) => (
            <Card key={i} className={previewIndex === i ? "ring-1 ring-nula-violet/40" : undefined}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {isSequence ? `Email ${i + 1}` : "Your email"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {i === 0 ? (
                    <span className="text-xs text-muted-foreground">sends on launch</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={String(email.delayDays)}
                        onChange={(e) => updateEmail(i, { delayDays: Math.max(0, Number(e.target.value)) })}
                        className="h-8 w-16"
                        aria-label={`Email ${i + 1} delay in days`}
                      />
                      <span className="text-xs text-muted-foreground">days after launch</span>
                    </div>
                  )}
                  {isSequence && emails.length > 1 ? (
                    <Button variant="ghost" size="icon-sm" onClick={() => removeEmail(i)} aria-label={`Remove email ${i + 1}`}>
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3" onFocusCapture={() => setPreviewIndex(i)}>
                <Field>
                  <FieldLabel>Subject</FieldLabel>
                  <Input
                    value={email.subject}
                    onChange={(e) => updateEmail(i, { subject: e.target.value })}
                    placeholder="A little something for you"
                  />
                </Field>

                <Field>
                  <FieldLabel>Featured image (optional)</FieldLabel>
                  {email.featuredImageUrl ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={email.featuredImageUrl}
                        alt="Featured"
                        className="h-16 w-28 rounded border object-cover"
                      />
                      <Button variant="outline" size="sm" onClick={() => updateEmail(i, { featuredImageUrl: "" })}>
                        <X data-icon="inline-start" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      {uploadingIndex === i ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                      Upload image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(i, file)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  )}
                  <FieldDescription>Shown full-width above your copy.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Body</FieldLabel>
                  <RichTextEditor
                    value={email.body}
                    onChange={(html) => updateEmail(i, { body: html })}
                    placeholder="Write your email… use the toolbar for headings, lists, and links."
                  />
                </Field>
              </CardContent>
            </Card>
          ))}

          {isSequence ? (
            <Button variant="outline" className="w-fit" onClick={addEmail}>
              <Plus data-icon="inline-start" />
              Add another email
            </Button>
          ) : null}
        </div>

        {/* Live preview column */}
        <div className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview</p>
            {isSequence && visibleEmails.length > 1 ? (
              <Select value={String(previewIndex)} onValueChange={(v) => setPreviewIndex(Number(v))}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleEmails.map((_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      Email {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            <iframe
              title="Email preview"
              srcDoc={previewHtml || "<p style='font-family:sans-serif;color:#888;padding:24px'>Start writing to see a preview…</p>"}
              className="h-[600px] w-full bg-white"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Header logo and footer contact/disclaimer come from your{" "}
            <Link href={`${APP_ROUTES.settings}?tab=workspace`} className="underline">
              company profile
            </Link>
            .
          </p>
        </div>
      </div>

      <CampaignSendHistory campaignId={campaign.id} />
    </div>
  )
}
