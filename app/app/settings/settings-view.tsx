"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { TeamSettings } from "@/components/settings/team-settings"
import { WorkspaceSettings } from "@/components/settings/workspace-settings"
import { LeadSourcesSettings } from "@/components/settings/lead-sources-settings"
import { EmailConnectionSettings } from "@/components/settings/email-connection-settings"
import { RoutingRulesSettings } from "@/components/settings/routing-rules-settings"
import { PlanSettings } from "@/components/settings/plan-settings"
import { useUrlTab } from "@/hooks/use-url-tab"

const SETTINGS_TABS = ["profile", "security", "team", "workspace", "leads", "plan"] as const
type SettingsTab = (typeof SETTINGS_TABS)[number]

export function SettingsView() {
  const [tab, setTab] = useUrlTab("tab", SETTINGS_TABS, "profile")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your account and team." />

      <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="workspace">Company</TabsTrigger>
          <TabsTrigger value="leads">Lead sources</TabsTrigger>
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

        <TabsContent value="leads" className="mt-6 flex flex-col gap-6" keepMounted>
          <EmailConnectionSettings />
          <RoutingRulesSettings />
          <LeadSourcesSettings />
        </TabsContent>

        <TabsContent value="plan" className="mt-6" keepMounted>
          <PlanSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
