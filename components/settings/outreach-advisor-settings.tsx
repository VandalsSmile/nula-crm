"use client"

import { useState } from "react"
import useSWR from "swr"
import { FileText, Globe, Loader2, Plus, Rocket, RotateCcw, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { getAddonState, type AddonState } from "@/app/actions/billing"
import {
  getOutreachProfile,
  resetOutreachProfile,
  saveOutreachProfile,
  suggestProfileFromText,
  suggestProfileFromWebsite,
} from "@/app/actions/outreach"
import { SIGNAL_SOURCES, type OutreachApproach, type OutreachProfile, type OutreachSignal, type OutreachVertical } from "@/lib/outreach/types"
import { randomId } from "@/lib/library-helpers"

const SOURCE_LABELS: Record<string, string> = {
  self: "CRM field",
  enrichment: "Enrichment",
  site: "Website",
  manual: "Manual research",
}

const linesToArray = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean)
const arrayToLines = (a: string[]) => a.join("\n")

export function OutreachAdvisorSettings() {
  const { data: addon } = useSWR<AddonState>("addon-state", () => getAddonState())
  const enabled = Boolean(addon?.module.enabled)

  const { data, mutate, isLoading } = useSWR<OutreachProfile>(
    enabled ? "outreach-profile" : null,
    () => getOutreachProfile(),
  )

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-5 text-nula-violet" />
            Outreach Advisor
          </CardTitle>
          <CardDescription>
            Part of the B2B Intelligence package. Teach Nula what a good target looks like for your
            business, then let it score prospects and draft grounded cold outreach. Add the module
            from Settings → Plan to turn it on.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading your playbook…
      </div>
    )
  }

  // Keyed so a reset (new updatedAt) remounts the editor with fresh initial state,
  // avoiding setState-in-effect sync.
  return <PlaybookEditor key={`${data.id}:${data.updatedAt}`} initial={data} onSynced={(p) => mutate(p, { revalidate: false })} />
}

function PlaybookEditor({
  initial,
  onSynced,
}: {
  initial: OutreachProfile
  onSynced: (p: OutreachProfile) => void
}) {
  const [draft, setDraft] = useState<OutreachProfile>(initial)
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [importText, setImportText] = useState("")
  const [busy, setBusy] = useState<"" | "website" | "import">("")

  function patch(p: Partial<OutreachProfile>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function applyDraft(result: {
    name?: string
    positioning?: string
    valueProp?: string
    offerings?: string[]
    doNotSend?: string[]
    approaches?: OutreachProfile["approaches"]
  }) {
    const applied = Object.entries(result).filter(([, v]) => v !== undefined)
    if (applied.length === 0) {
      toast.message("Nothing to import", {
        description: "Connect an AI provider (Settings → Intelligence) to auto-fill from text/website.",
      })
      return false
    }
    patch(Object.fromEntries(applied))
    return true
  }

  async function handleFromWebsite() {
    if (!websiteUrl.trim()) return
    setBusy("website")
    try {
      const res = await suggestProfileFromWebsite(websiteUrl.trim())
      if (applyDraft(res)) toast.success("Pulled from your website — review and Save")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that site")
    } finally {
      setBusy("")
    }
  }

  async function handleFromText() {
    if (!importText.trim()) return
    setBusy("import")
    try {
      const res = await suggestProfileFromText(importText)
      if (applyDraft(res)) {
        toast.success("Imported your playbook — review and Save")
        setImportText("")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import")
    } finally {
      setBusy("")
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await saveOutreachProfile({
        name: draft.name,
        positioning: draft.positioning,
        valueProp: draft.valueProp,
        offerings: draft.offerings,
        verticals: draft.verticals,
        signals: draft.signals,
        approaches: draft.approaches,
        formula: draft.formula,
        doNotSend: draft.doNotSend,
      })
      setDraft(saved)
      onSynced(saved)
      toast.success("Playbook saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    try {
      const fresh = await resetOutreachProfile()
      onSynced(fresh)
      toast.success("Reset to the starter playbook")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset")
    }
  }

  const approachOptions = draft.approaches

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Teach Nula who you sell to and the angles that work. The Advisor uses this to score
          targets and draft grounded cold emails.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResetOpen(true)} disabled={saving}>
            <RotateCcw data-icon="inline-start" />
            Reset to starter
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Save playbook
          </Button>
        </div>
      </div>

      {/* Jump-start */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="size-4 text-primary" />
            Jump-start your playbook
          </CardTitle>
          <CardDescription>
            Pull from your website or paste an existing outreach guide. We&apos;ll fill in what we can
            for you to review — nothing saves until you click Save.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="oa-website">Build from your website</FieldLabel>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="oa-website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="yourcompany.com"
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={handleFromWebsite} disabled={busy !== "" || !websiteUrl.trim()}>
                {busy === "website" ? <Loader2 className="animate-spin" /> : <Globe />}
                Pull
              </Button>
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="oa-import">Import a playbook (paste a doc/guide)</FieldLabel>
            <Textarea
              id="oa-import"
              rows={3}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste your existing sales/BD outreach guide here…"
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleFromText} disabled={busy !== "" || !importText.trim()}>
                {busy === "import" ? <Loader2 className="animate-spin" /> : <FileText />}
                Import
              </Button>
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Positioning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positioning</CardTitle>
          <CardDescription>What you really sell, in your words — not a service list.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="oa-name">Playbook name</FieldLabel>
            <Input id="oa-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="oa-positioning">Core positioning</FieldLabel>
            <Textarea
              id="oa-positioning"
              rows={3}
              value={draft.positioning}
              onChange={(e) => patch({ positioning: e.target.value })}
              placeholder="e.g. We're your growth partner — we make the pieces work together to put more money in your pocket."
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="oa-valueprop">One-line value proposition</FieldLabel>
            <Input
              id="oa-valueprop"
              value={draft.valueProp}
              onChange={(e) => patch({ valueProp: e.target.value })}
              placeholder="The single sentence a prospect should remember."
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="oa-offerings">Offerings (one per line)</FieldLabel>
            <Textarea
              id="oa-offerings"
              rows={3}
              value={arrayToLines(draft.offerings)}
              onChange={(e) => patch({ offerings: linesToArray(e.target.value) })}
              placeholder={"Web\nSEO\nPaid ads\nCRM"}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Approaches */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Outreach angles</CardTitle>
            <CardDescription>The plays reps choose from based on what they find.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                approaches: [
                  ...draft.approaches,
                  {
                    id: randomId("ap"),
                    name: "New angle",
                    useWhen: "",
                    pointToMake: "",
                    conversationStarter: "",
                    dontUseWhen: "",
                    audiences: ["sales"],
                    proof: "",
                  },
                ],
              })
            }
          >
            <Plus data-icon="inline-start" /> Add angle
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {draft.approaches.map((a, i) => (
            <ApproachEditor
              key={a.id}
              approach={a}
              onChange={(next) => {
                const approaches = [...draft.approaches]
                approaches[i] = next
                patch({ approaches })
              }}
              onRemove={() => patch({ approaches: draft.approaches.filter((x) => x.id !== a.id) })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Signals */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Qualifying signals</CardTitle>
            <CardDescription>
              What to look for. Each signal adds to a target&apos;s fit score and can argue for an
              angle. Use a negative weight for disqualifiers.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                signals: [
                  ...draft.signals,
                  {
                    id: randomId("sg"),
                    label: "New signal",
                    description: "",
                    weight: 10,
                    source: "manual",
                    approachId: "",
                    approachWeight: 0,
                  },
                ],
              })
            }
          >
            <Plus data-icon="inline-start" /> Add signal
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {draft.signals.map((s, i) => (
            <SignalEditor
              key={s.id}
              signal={s}
              approaches={approachOptions}
              onChange={(next) => {
                const signals = [...draft.signals]
                signals[i] = next
                patch({ signals })
              }}
              onRemove={() => patch({ signals: draft.signals.filter((x) => x.id !== s.id) })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Verticals */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Verticals</CardTitle>
            <CardDescription>Tailor the message per type of business you sell into.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                verticals: [
                  ...draft.verticals,
                  {
                    id: randomId("vt"),
                    label: "New vertical",
                    primaryProblem: "",
                    strongQuestions: [],
                    preferredApproachIds: [],
                  },
                ],
              })
            }
          >
            <Plus data-icon="inline-start" /> Add vertical
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {draft.verticals.map((v, i) => (
            <VerticalEditor
              key={v.id}
              vertical={v}
              approaches={approachOptions}
              onChange={(next) => {
                const verticals = [...draft.verticals]
                verticals[i] = next
                patch({ verticals })
              }}
              onRemove={() => patch({ verticals: draft.verticals.filter((x) => x.id !== v.id) })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Formula + Do not send */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email formula</CardTitle>
          <CardDescription>The shape of every cold email. Edit the guidance per step.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {draft.formula.map((step, i) => (
            <div key={step.key} className="grid gap-2 sm:grid-cols-[120px_1fr]">
              <Input
                value={step.label}
                onChange={(e) => {
                  const formula = [...draft.formula]
                  formula[i] = { ...step, label: e.target.value }
                  patch({ formula })
                }}
              />
              <Input
                value={step.guidance}
                onChange={(e) => {
                  const formula = [...draft.formula]
                  formula[i] = { ...step, guidance: e.target.value }
                  patch({ formula })
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Never send</CardTitle>
          <CardDescription>
            Patterns the drafter must avoid (generic claims, insults, filler). One per line.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={arrayToLines(draft.doNotSend)}
            onChange={(e) => patch({ doNotSend: linesToArray(e.target.value) })}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save playbook
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset playbook?"
        description="Replace your current playbook with the industry starter. Your edits to positioning, angles, and signals will be lost."
        confirmLabel="Reset"
        onConfirm={handleReset}
      />
    </div>
  )
}

function AudienceToggle({
  value,
  onChange,
}: {
  value: ("sales" | "bd")[]
  onChange: (v: ("sales" | "bd")[]) => void
}) {
  const toggle = (a: "sales" | "bd") =>
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a])
  return (
    <div className="flex items-center gap-4">
      {(["sales", "bd"] as const).map((a) => (
        <label key={a} className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.includes(a)} onCheckedChange={() => toggle(a)} />
          {a === "sales" ? "Sales" : "BD"}
        </label>
      ))}
    </div>
  )
}

function ApproachEditor({
  approach,
  onChange,
  onRemove,
}: {
  approach: OutreachApproach
  onChange: (a: OutreachApproach) => void
  onRemove: () => void
}) {
  const set = (p: Partial<OutreachApproach>) => onChange({ ...approach, ...p })
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Input
          className="font-medium"
          value={approach.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Angle name"
        />
        <Button variant="ghost" size="icon-sm" aria-label="Remove angle" onClick={onRemove}>
          <Trash2 className="text-destructive" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>Use when</FieldLabel>
          <Textarea rows={2} value={approach.useWhen} onChange={(e) => set({ useWhen: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel>Don&apos;t use when</FieldLabel>
          <Textarea rows={2} value={approach.dontUseWhen} onChange={(e) => set({ dontUseWhen: e.target.value })} />
        </Field>
      </div>
      <Field>
        <FieldLabel>The point to make</FieldLabel>
        <Textarea rows={2} value={approach.pointToMake} onChange={(e) => set({ pointToMake: e.target.value })} />
      </Field>
      <Field>
        <FieldLabel>Conversation starter</FieldLabel>
        <Textarea
          rows={2}
          value={approach.conversationStarter}
          onChange={(e) => set({ conversationStarter: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>Proof (optional — only cited if provided)</FieldLabel>
        <Input value={approach.proof} onChange={(e) => set({ proof: e.target.value })} placeholder="A specific, verifiable result" />
      </Field>
      <div>
        <FieldLabel>Best for</FieldLabel>
        <div className="mt-1.5">
          <AudienceToggle value={approach.audiences} onChange={(audiences) => set({ audiences })} />
        </div>
      </div>
    </div>
  )
}

function SignalEditor({
  signal,
  approaches,
  onChange,
  onRemove,
}: {
  signal: OutreachSignal
  approaches: OutreachApproach[]
  onChange: (s: OutreachSignal) => void
  onRemove: () => void
}) {
  const set = (p: Partial<OutreachSignal>) => onChange({ ...signal, ...p })
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Input
          className="font-medium"
          value={signal.label}
          onChange={(e) => set({ label: e.target.value })}
          placeholder="Signal label"
        />
        <Button variant="ghost" size="icon-sm" aria-label="Remove signal" onClick={onRemove}>
          <Trash2 className="text-destructive" />
        </Button>
      </div>
      <Input value={signal.description} onChange={(e) => set({ description: e.target.value })} placeholder="What it means / research hint" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel>Weight</FieldLabel>
          <Input
            type="number"
            value={signal.weight}
            onChange={(e) => set({ weight: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field>
          <FieldLabel>Observed from</FieldLabel>
          <Select value={signal.source} onValueChange={(v) => set({ source: (v as OutreachSignal["source"]) ?? "manual" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIGNAL_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Argues for angle</FieldLabel>
          <Select value={signal.approachId || "none"} onValueChange={(v) => set({ approachId: v === "none" ? "" : (v ?? "") })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {approaches.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Angle weight</FieldLabel>
          <Input
            type="number"
            value={signal.approachWeight}
            onChange={(e) => set({ approachWeight: Number(e.target.value) || 0 })}
            disabled={!signal.approachId}
          />
        </Field>
      </div>
    </div>
  )
}

function VerticalEditor({
  vertical,
  approaches,
  onChange,
  onRemove,
}: {
  vertical: OutreachVertical
  approaches: OutreachApproach[]
  onChange: (v: OutreachVertical) => void
  onRemove: () => void
}) {
  const set = (p: Partial<OutreachVertical>) => onChange({ ...vertical, ...p })
  const togglePreferred = (id: string) =>
    set({
      preferredApproachIds: vertical.preferredApproachIds.includes(id)
        ? vertical.preferredApproachIds.filter((x) => x !== id)
        : [...vertical.preferredApproachIds, id],
    })
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Input
          className="font-medium"
          value={vertical.label}
          onChange={(e) => set({ label: e.target.value })}
          placeholder="Vertical name"
        />
        <Button variant="ghost" size="icon-sm" aria-label="Remove vertical" onClick={onRemove}>
          <Trash2 className="text-destructive" />
        </Button>
      </div>
      <Field>
        <FieldLabel>Primary problem</FieldLabel>
        <Input value={vertical.primaryProblem} onChange={(e) => set({ primaryProblem: e.target.value })} />
      </Field>
      <Field>
        <FieldLabel>Strong questions (one per line)</FieldLabel>
        <Textarea
          rows={2}
          value={arrayToLines(vertical.strongQuestions)}
          onChange={(e) => set({ strongQuestions: linesToArray(e.target.value) })}
        />
      </Field>
      {approaches.length > 0 ? (
        <div>
          <FieldLabel>Preferred angles</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
            {approaches.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={vertical.preferredApproachIds.includes(a.id)}
                  onCheckedChange={() => togglePreferred(a.id)}
                />
                {a.name}
              </label>
            ))}
          </div>
          <FieldDescription className="mt-1.5">
            Which angles work best for this vertical.
          </FieldDescription>
        </div>
      ) : null}
    </div>
  )
}
