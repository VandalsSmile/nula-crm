"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Rocket, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { CampaignFormDialog } from "@/components/campaign-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CAMPAIGN_TEMPLATES } from "@/lib/crm-defaults"
import type { Campaign, Group } from "@/lib/crm-types"
import {
  approveCampaign,
  createCampaignFromTemplate,
  deleteCampaign,
  launchCampaign,
} from "@/app/actions/campaigns"

export function CampaignsView({
  campaigns,
  groups,
}: {
  campaigns: Campaign[]
  groups: Group[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)

  function createFromTemplate(templateId: string) {
    startTransition(async () => {
      try {
        const result = await createCampaignFromTemplate(templateId)
        toast.success(`Created draft: ${result.name}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create campaign")
      }
    })
  }

  function approve(id: string) {
    startTransition(async () => {
      try {
        await approveCampaign(id)
        toast.success("Campaign marked for approval")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Approve failed")
      }
    })
  }

  function launch(id: string) {
    startTransition(async () => {
      try {
        const result = await launchCampaign(id)
        toast.success(result.message)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Launch failed")
      }
    })
  }

  function handleDelete(campaign: Campaign) {
    startTransition(async () => {
      try {
        await deleteCampaign(campaign.id)
        toast.success(`Deleted "${campaign.name}"`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete campaign")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Email, SMS, and sequences — built from templates and AI drafts."
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold">Templates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <Badge variant="outline">{t.goal}</Badge>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => createFromTemplate(t.id)}>
                  <Plus data-icon="inline-start" />
                  Create draft
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Your campaigns</h2>
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No campaigns yet. Create from a template or use the AI command bar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription>{c.goal}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{c.type}</Badge>
                    <Badge variant="secondary">{c.status}</Badge>
                    {c.groupId ? (
                      <Badge variant="outline">
                        {groups.find((g) => g.id === c.groupId)?.name ?? "Group"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditCampaign(c)}>
                      <Pencil data-icon="inline-start" />
                      Edit
                    </Button>
                    {c.status === "draft" ? (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => approve(c.id)}>
                        Submit for approval
                      </Button>
                    ) : null}
                    {c.status === "draft" || c.status === "pending_approval" || c.status === "scheduled" ? (
                      <Button size="sm" disabled={pending} onClick={() => launch(c.id)}>
                        <Rocket data-icon="inline-start" />
                        Launch
                      </Button>
                    ) : null}
                    {c.status !== "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editCampaign ? (
        <CampaignFormDialog
          open={!!editCampaign}
          onOpenChange={(open) => !open && setEditCampaign(null)}
          campaign={editCampaign}
          groups={groups}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete campaign?"
        description={`Remove "${deleteTarget?.name}"?`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
