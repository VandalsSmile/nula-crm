"use client"

import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import useSWR from "swr"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { TeamSettings } from "@/components/settings/team-settings"
import { WorkspaceSettings } from "@/components/settings/workspace-settings"
import { LeadSourcesSettings } from "@/components/settings/lead-sources-settings"
import { ApiAccessSettings } from "@/components/settings/api-access-settings"
import { BookingsWebhookSettings } from "@/components/settings/bookings-webhook-settings"
import { EmailSettings } from "@/components/settings/email-settings"
import { EmailConnectionSettings } from "@/components/settings/email-connection-settings"
import { RoutingRulesSettings } from "@/components/settings/routing-rules-settings"
import { PlanSettings } from "@/components/settings/plan-settings"
import { IntelligenceSettings } from "@/components/settings/intelligence-settings"
import { SignatureSettings } from "@/components/settings/signature-settings"
import { getAddonState, type AddonState } from "@/app/actions/billing"
import { useUrlTab } from "@/hooks/use-url-tab"

const SETTINGS_TABS = [
  "profile",
  "security",
  "team",
  "workspace",
  "email",
  "signature",
  "leads",
  "intelligence",
  "plan",
] as const
type SettingsTab = (typeof SETTINGS_TABS)[number]

/** Collapsible section for the Lead sources tab. */
function LeadSection({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform duration-200 group-open:rotate-90" />
        {title}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}

export function SettingsView() {
  const [tab, setTab] = useUrlTab("tab", SETTINGS_TABS, "profile")
  const { data: addon } = useSWR<AddonState>("addon-state", () => getAddonState())
  const intelligenceEnabled = Boolean(addon?.module.enabled)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your account and team." />

      <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="workspace">Company</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="signature">Signature</TabsTrigger>
          <TabsTrigger value="leads">Lead sources</TabsTrigger>
          {intelligenceEnabled ? <TabsTrigger value="intelligence">Intelligence</TabsTrigger> : null}
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        {/* keepMounted keeps each panel's form state alive when switching tabs,
            so unsaved edits aren't lost by unmounting the inactive tab. */}
        <TabsContent value="profile" className="mt-6" keepMounted>
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-6" keepMounted>
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="team" className="mt-6" keepMounted>
          <TeamSettings />
        </TabsContent>

        <TabsContent value="workspace" className="mt-6" keepMounted>
          <WorkspaceSettings />
        </TabsContent>

        <TabsContent value="email" className="mt-6" keepMounted>
          <EmailSettings />
        </TabsContent>

        <TabsContent value="signature" className="mt-6" keepMounted>
          <SignatureSettings />
        </TabsContent>

        <TabsContent value="leads" className="mt-6 flex flex-col gap-3" keepMounted>
          <LeadSection title="Zapier & API access" defaultOpen>
            <ApiAccessSettings />
          </LeadSection>
          <LeadSection title="Appointment bookings">
            <BookingsWebhookSettings />
          </LeadSection>
          <LeadSection title="Email logging">
            <EmailConnectionSettings />
          </LeadSection>
          <LeadSection title="Routing rules">
            <RoutingRulesSettings />
          </LeadSection>
          <LeadSection title="Lead sources">
            <LeadSourcesSettings />
          </LeadSection>
        </TabsContent>

        <TabsContent value="intelligence" className="mt-6" keepMounted>
          <IntelligenceSettings />
        </TabsContent>

        <TabsContent value="plan" className="mt-6" keepMounted>
          <PlanSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
