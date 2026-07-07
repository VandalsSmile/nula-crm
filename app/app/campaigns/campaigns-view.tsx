"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Rocket, Plus } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CAMPAIGN_TEMPLATES } from "@/lib/crm-defaults"
import type { Campaign } from "@/lib/crm-types"
import {
  approveCampaign,
  createCampaignFromTemplate,
  launchCampaign,
} from "@/app/actions/campaigns"

export function CampaignsView({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

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
              No campaigns yet. Use the AI command bar: &quot;Create a reactivation campaign for customers who
              haven&apos;t bought in 90 days.&quot;
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
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
