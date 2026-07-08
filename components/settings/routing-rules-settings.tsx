"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  createRoutingRule,
  deleteRoutingRule,
  listRoutingRules,
  previewRouting,
  updateRoutingRule,
} from "@/app/actions/routing-rules"
import { LEAD_STATUSES, LIFECYCLE_STAGES, type RoutingOutcome, type RoutingRule } from "@/lib/crm-types"
import { useSessionUser } from "@/lib/session-context"
import { canManageSettings } from "@/lib/roles"

const CHANNELS = [
  { v: "any", l: "Any channel" },
  { v: "web_form", l: "Web form" },
  { v: "webhook", l: "Webhook" },
  { v: "email", l: "Email" },
  { v: "call", l: "Phone call" },
  { v: "csv", l: "CSV import" },
  { v: "api", l: "API" },
]

function channelLabel(v: string) {
  return CHANNELS.find((c) => c.v === v)?.l ?? v
}

function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function ConditionSummary({ rule }: { rule: RoutingRule }) {
  const c = rule.conditions
  const parts: string[] = []
  if (c.channel) parts.push(channelLabel(c.channel))
  if (c.sourceKey) parts.push(`source=${c.sourceKey}`)
  if (typeof c.minScore === "number") parts.push(`score ≥ ${c.minScore}`)
  if (c.keywords?.length) parts.push(`keyword: ${c.keywords.join(" / ")}`)
  return (
    <span className="text-sm text-muted-foreground">
      {parts.length ? `When ${parts.join(", ")}` : "Matches every lead"}
    </span>
  )
}

function ActionSummary({ rule }: { rule: RoutingRule }) {
  const a = rule.actions
  const chips: string[] = []
  a.addTags?.forEach((t) => chips.push(`#${t}`))
  a.addGroups?.forEach((g) => chips.push(`→ ${g}`))
  if (a.setLeadStatus) chips.push(`status: ${a.setLeadStatus}`)
  if (a.setLifecycle) chips.push(`stage: ${a.setLifecycle}`)
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.length ? (
        chips.map((c) => (
          <Badge key={c} variant="secondary">
            {c}
          </Badge>
        ))
      ) : (
        <span className="text-sm text-muted-foreground">No actions</span>
      )}
    </div>
  )
}

export function RoutingRulesSettings() {
  const me = useSessionUser()
  const isAdmin = canManageSettings(me.role)
  const { data: rules = [], isLoading, mutate } = useSWR<RoutingRule[]>("routing-rules", () =>
    listRoutingRules(),
  )

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [channel, setChannel] = useState("any")
  const [sourceKey, setSourceKey] = useState("")
  const [minScore, setMinScore] = useState("")
  const [keywords, setKeywords] = useState("")
  const [addTags, setAddTags] = useState("")
  const [addGroups, setAddGroups] = useState("")
  const [status, setStatus] = useState("keep")
  const [stage, setStage] = useState("keep")

  const [previewText, setPreviewText] = useState("")
  const [previewChannel, setPreviewChannel] = useState("web_form")
  const [previewSource, setPreviewSource] = useState("website-form")
  const [previewScore, setPreviewScore] = useState("60")
  const [preview, setPreview] = useState<RoutingOutcome | null>(null)
  const [previewing, setPreviewing] = useState(false)

  function resetForm() {
    setName("")
    setChannel("any")
    setSourceKey("")
    setMinScore("")
    setKeywords("")
    setAddTags("")
    setAddGroups("")
    setStatus("keep")
    setStage("keep")
    setShowForm(false)
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give the rule a name")
      return
    }
    setSaving(true)
    try {
      await createRoutingRule({
        name,
        conditions: {
          channel: channel === "any" ? undefined : channel,
          sourceKey: sourceKey || undefined,
          minScore: minScore ? Number(minScore) : undefined,
          keywords: csv(keywords),
        },
        actions: {
          addTags: csv(addTags),
          addGroups: csv(addGroups),
          setLeadStatus: status === "keep" ? undefined : status,
          setLifecycle: stage === "keep" ? undefined : stage,
        },
      })
      toast.success("Routing rule created")
      resetForm()
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create rule")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(rule: RoutingRule, enabled: boolean) {
    mutate(
      rules.map((r) => (r.id === rule.id ? { ...r, enabled } : r)),
      false,
    )
    try {
      await updateRoutingRule(rule.id, { enabled })
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update rule")
      mutate()
    }
  }

  async function handleDelete(rule: RoutingRule) {
    try {
      await deleteRoutingRule(rule.id)
      toast.success("Rule deleted")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete rule")
    }
  }

  async function handlePreview() {
    setPreviewing(true)
    try {
      const outcome = await previewRouting({
        channel: previewChannel,
        sourceKey: previewSource,
        leadScore: Number(previewScore) || 0,
        text: previewText,
      })
      setPreview(outcome)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run preview")
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Lead routing rules</CardTitle>
          <CardDescription>
            Automatically tag, group, and stage leads as they arrive. Rules run in order; all
            matching rules apply.
          </CardDescription>
        </div>
        {isAdmin ? (
          <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={saving}>
            <Plus className="size-4" />
            New rule
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {showForm && isAdmin ? (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="rule-name">Rule name</Label>
                <Input
                  id="rule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="High-intent website leads"
                />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              When a lead matches
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => v && setChannel(v)}>
                  <SelectTrigger>
                    <SelectValue>{(v) => channelLabel((v as string) ?? "any")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.v} value={c.v}>
                        {c.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rule-source">Source key (optional)</Label>
                <Input
                  id="rule-source"
                  value={sourceKey}
                  onChange={(e) => setSourceKey(e.target.value)}
                  placeholder="website-form"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rule-score">Minimum lead score</Label>
                <Input
                  id="rule-score"
                  type="number"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rule-keywords">Keywords (comma-separated)</Label>
                <Input
                  id="rule-keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="pricing, demo, urgent"
                />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Then apply
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rule-tags">Add tags (comma-separated)</Label>
                <Input
                  id="rule-tags"
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                  placeholder="Hot lead, Website"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rule-groups">Add to groups (comma-separated)</Label>
                <Input
                  id="rule-groups"
                  value={addGroups}
                  onChange={(e) => setAddGroups(e.target.value)}
                  placeholder="Priority Follow-up"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Set lead status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v) => ((v as string) === "keep" ? "Leave unchanged" : (v as string))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Leave unchanged</SelectItem>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Set lifecycle stage</Label>
                <Select value={stage} onValueChange={(v) => v && setStage(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v) => ((v as string) === "keep" ? "Leave unchanged" : (v as string))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Leave unchanged</SelectItem>
                    {LIFECYCLE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save rule
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col divide-y rounded-lg border">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No routing rules yet. Every lead still gets its source tag and lands in New Leads.
            </p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    {!rule.enabled ? <Badge variant="outline">Disabled</Badge> : null}
                  </div>
                  <ConditionSummary rule={rule} />
                  <ActionSummary rule={rule} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => handleToggle(rule, v)}
                    disabled={!isAdmin}
                    aria-label="Toggle rule"
                  />
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule)}
                      aria-label="Delete rule"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Preview / dry-run */}
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            <span className="text-sm font-medium">Preview against a sample lead</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Channel</Label>
              <Select value={previewChannel} onValueChange={(v) => v && setPreviewChannel(v)}>
                <SelectTrigger>
                  <SelectValue>{(v) => channelLabel((v as string) ?? "web_form")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.filter((c) => c.v !== "any").map((c) => (
                    <SelectItem key={c.v} value={c.v}>
                      {c.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-source">Source key</Label>
              <Input
                id="pv-source"
                value={previewSource}
                onChange={(e) => setPreviewSource(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-score">Lead score</Label>
              <Input
                id="pv-score"
                type="number"
                value={previewScore}
                onChange={(e) => setPreviewScore(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-text">Message / keywords</Label>
              <Input
                id="pv-text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="wants pricing asap"
              />
            </div>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
              {previewing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Run preview
            </Button>
          </div>
          {preview ? (
            <div className="rounded-md border bg-background p-3 text-sm">
              {preview.matchedRules.length === 0 ? (
                <p className="text-muted-foreground">No rules match this lead.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p>
                    <span className="font-medium">Matched:</span> {preview.matchedRules.join(", ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.addedTags.map((t) => (
                      <Badge key={`t-${t}`} variant="secondary">
                        #{t}
                      </Badge>
                    ))}
                    {preview.addedGroups.map((g) => (
                      <Badge key={`g-${g}`} variant="secondary">
                        → {g}
                      </Badge>
                    ))}
                    {preview.leadStatus ? (
                      <Badge variant="outline">status: {preview.leadStatus}</Badge>
                    ) : null}
                    {preview.lifecycle ? (
                      <Badge variant="outline">stage: {preview.lifecycle}</Badge>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
