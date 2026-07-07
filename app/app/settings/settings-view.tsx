"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { TeamSettings } from "@/components/settings/team-settings"
import { useUrlTab } from "@/hooks/use-url-tab"

const SETTINGS_TABS = ["profile", "security", "team"] as const
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
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
