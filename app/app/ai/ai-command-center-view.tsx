"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Undo2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { undoLastAiAction } from "@/app/actions/ai"
import type { AiAction } from "@/lib/crm-types"
import { formatDateTime } from "@/lib/format"

export function AiCommandCenterView({
  actions,
  pendingCount,
}: {
  actions: AiAction[]
  pendingCount: number
}) {
  const router = useRouter()
  const [undoing, startUndo] = useTransition()

  function handleUndo() {
    startUndo(async () => {
      try {
        const result = await undoLastAiAction()
        toast.success(result.summary)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nothing to undo")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Command Center"
        description="Recent AI actions, pending approvals, and undo history."
        actions={
          <Button variant="outline" onClick={handleUndo} disabled={undoing}>
            <Undo2 data-icon="inline-start" />
            Undo last action
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pendingCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent actions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{actions.length}</CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4" />
              Suggested cleanup
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Run &quot;Normalize all tags&quot; from the command bar to consolidate similar tags.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI actions yet. Use the command bar above.</p>
          ) : (
            actions.map((action) => (
              <div key={action.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{action.preview.title}</span>
                  <Badge variant="outline">{action.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">&quot;{action.command}&quot;</p>
                {action.summary ? <p className="text-sm">{action.summary}</p> : null}
                <span className="text-xs text-muted-foreground">{formatDateTime(action.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
