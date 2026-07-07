"use client"

import { Users } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Group } from "@/lib/crm-types"

export function GroupsView({ groups }: { groups: Group[] }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Groups"
        description="Intentional audiences for campaigns and automations. Tags describe facts; groups describe who to reach."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{group.name}</CardTitle>
                {group.isSystem ? <Badge variant="secondary">Default</Badge> : null}
              </div>
              {group.description ? <CardDescription>{group.description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {group.memberCount ?? 0} contacts
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
