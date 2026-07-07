"use client"

import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, Sparkles } from "lucide-react"

import { LifecycleBadge, LeadScoreBadge } from "@/components/lifecycle-badge"
import { ActivityFeed } from "@/components/activity-feed"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { formatDateTime } from "@/lib/format"
import { formatRevenue, type Activity, type Contact } from "@/lib/crm-types"
import { APP_ROUTES } from "@/lib/routes"

export function ContactProfile({
  contact,
  activities,
}: {
  contact: Contact
  activities: Activity[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={APP_ROUTES.contacts} />}>Contacts</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{contact.fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{contact.fullName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <LifecycleBadge stage={contact.lifecycleStage} />
            <LeadScoreBadge score={contact.leadScore} />
            {contact.source ? <Badge variant="secondary">Source: {contact.source}</Badge> : null}
          </div>
        </div>
        <Button variant="outline" render={<Link href={APP_ROUTES.contacts} />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      </div>

      {contact.aiSummary || contact.recommendedNextAction ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              AI insight
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {contact.aiSummary ? <p className="mb-2">{contact.aiSummary}</p> : null}
            {contact.recommendedNextAction ? (
              <p className="font-medium text-primary">Next: {contact.recommendedNextAction}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {contact.email ? (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {contact.email}
              </div>
            ) : null}
            {contact.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {contact.phone}
              </div>
            ) : null}
            {contact.city || contact.state ? (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                {[contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}
              </div>
            ) : null}
            <Separator />
            <div>
              <span className="text-muted-foreground">Revenue: </span>
              <span className="font-medium">{formatRevenue(contact.totalRevenueCents)}</span>
            </div>
            {contact.lastPurchaseAt ? (
              <div>
                <span className="text-muted-foreground">Last purchase: </span>
                {formatDateTime(contact.lastPurchaseAt)}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags & groups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.length ? (
                  contact.tags.map((t) => (
                    <Badge key={t.id} variant="outline">
                      {t.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Groups</p>
              <div className="flex flex-wrap gap-1.5">
                {contact.groups.length ? (
                  contact.groups.map((g) => (
                    <Badge key={g.id} variant="secondary">
                      {g.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No groups</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {contact.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{contact.notes}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={activities} />
        </CardContent>
      </Card>
    </div>
  )
}
