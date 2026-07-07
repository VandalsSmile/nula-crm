"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { AutomationFormDialog } from "@/components/automation-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  deleteAutomation,
  listAutomations,
  runInactiveDetectionNow,
  toggleAutomation,
} from "@/app/actions/automations"

type AutomationRow = Awaited<ReturnType<typeof listAutomations>>[number]

const TRIGGER_LABELS: Record<string, string> = {
  form_submitted: "When a new lead arrives",
  cron_daily: "Daily check",
  purchase_made: "When a purchase is made",
  lead_scored: "When lead score is calculated",
}

export function AutomationsView({ automations }: { automations: AutomationRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editAuto, setEditAuto] = useState<AutomationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AutomationRow | null>(null)

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleAutomation(id, enabled)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update automation")
      }
    })
  }

  async function runInactiveNow() {
    setRunning(true)
    try {
      const result = await runInactiveDetectionNow()
      toast.success(
        result.updated > 0
          ? `Marked ${result.updated} customer(s) inactive and created reactivation draft`
          : "No new inactive customers found",
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Automation run failed")
    } finally {
      setRunning(false)
    }
  }

  function handleDelete(auto: AutomationRow) {
    startTransition(async () => {
      try {
        await deleteAutomation(auto.id)
        toast.success(`Deleted "${auto.name}"`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete automation")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Automations"
        description="When this happens, do that — simple rules that keep your CRM moving."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={runInactiveNow} disabled={running}>
              <RefreshCw className={running ? "animate-spin" : ""} data-icon="inline-start" />
              Run inactive check now
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Create automation
            </Button>
          </div>
        }
      />

      <div className="grid gap-4">
        {automations.map((auto) => (
          <Card key={auto.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{auto.name}</CardTitle>
                <CardDescription>{TRIGGER_LABELS[auto.trigger] ?? auto.trigger}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={auto.enabled ? "default" : "secondary"}>
                  {auto.enabled ? "On" : "Off"}
                </Badge>
                <Switch
                  checked={auto.enabled}
                  disabled={pending}
                  onCheckedChange={(checked) => handleToggle(auto.id, checked)}
                />
                <Button variant="ghost" size="icon-sm" onClick={() => setEditAuto(auto)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(auto)}>
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{auto.action}</Badge>
              {auto.lastRunAt ? <span>Last run: {new Date(auto.lastRunAt).toLocaleString()}</span> : null}
              {auto.trigger === "cron_daily" ? (
                <span className="flex items-center gap-1">
                  <Play className="size-3.5" /> Runs daily via cron
                </span>
              ) : null}
              {auto.trigger === "form_submitted" ? (
                <span>Triggers on webhook: POST /api/webhooks/leads</span>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <AutomationFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AutomationFormDialog
        open={!!editAuto}
        onOpenChange={(open) => !open && setEditAuto(null)}
        automation={editAuto}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete automation?"
        description={`Remove "${deleteTarget?.name}"?`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
