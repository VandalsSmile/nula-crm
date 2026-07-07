"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Unplug,
  KeyRound,
} from "lucide-react"

import { LacrmStatusBadge } from "@/components/status-badge"
import { EditClientDialog } from "@/components/edit-client-dialog"
import { DeleteClientDialog } from "@/components/delete-client-dialog"
import { LacrmConnectDialog } from "@/components/lacrm-connect-dialog"
import { disconnectLacrm, testLacrmConnection } from "@/app/actions/lacrm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { initials, type Client } from "@/lib/mock-data"
import { formatDateTime } from "@/lib/format"
import { formatTimezoneLabel } from "@/lib/timezones"

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe
  label: string
  value: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  )
}

export function ClientProfile({ client }: { client: Client }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [lacrmOpen, setLacrmOpen] = useState(false)
  const [testing, startTest] = useTransition()
  const [disconnecting, startDisconnect] = useTransition()

  function handleTestLacrm() {
    startTest(async () => {
      try {
        await testLacrmConnection(client.id)
        toast.success("LACRM connection is healthy")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Connection test failed")
      }
    })
  }

  function handleDisconnectLacrm() {
    startDisconnect(async () => {
      try {
        await disconnectLacrm(client.id)
        toast.success("LACRM disconnected")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to disconnect")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/clients" />}>Clients</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{client.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {client.logoUrl ? <AvatarImage src={client.logoUrl} alt={client.name} className="object-contain" /> : null}
            <AvatarFallback style={{ backgroundColor: client.accentColor, color: "white" }} className="text-lg">
              {initials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <LacrmStatusBadge status={client.lacrm.status} />
              {client.industry ? <span className="text-sm text-muted-foreground">{client.industry}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/clients" />}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon">
                  <MoreHorizontal />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit client
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>Primary contact and location information.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <InfoRow icon={Globe} label="Website" value={client.websiteUrl} />
            <InfoRow icon={Mail} label="Contact email" value={client.contactEmail} />
            <InfoRow icon={Phone} label="Phone" value={client.phone} />
            <InfoRow icon={MapPin} label="Location" value={client.location} />
            <InfoRow icon={Clock} label="Timezone" value={formatTimezoneLabel(client.timezone)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LACRM integration</CardTitle>
            <CardDescription>Connect Less Annoying CRM to sync contacts for this client.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <LacrmStatusBadge status={client.lacrm.status} />
            </div>
            {client.lacrm.accountName ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium">{client.lacrm.accountName}</span>
              </div>
            ) : null}
            {client.lacrm.lastCheckedAt ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Last checked</span>
                <span className="font-medium">{formatDateTime(client.lacrm.lastCheckedAt)}</span>
              </div>
            ) : null}
            <Separator />
            <div className="flex flex-wrap gap-2">
              {client.lacrm.status === "Connected" ? (
                <>
                  <Button variant="outline" onClick={handleTestLacrm} disabled={testing}>
                    <RefreshCw data-icon="inline-start" className={testing ? "animate-spin" : ""} />
                    Test connection
                  </Button>
                  <Button variant="outline" onClick={handleDisconnectLacrm} disabled={disconnecting}>
                    <Unplug data-icon="inline-start" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => setLacrmOpen(true)}>
                  <KeyRound data-icon="inline-start" />
                  Connect LACRM
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(client.brandVoice || client.targetAudience || client.commonServices || client.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Brand & notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {client.brandVoice ? (
              <div>
                <p className="text-xs text-muted-foreground">Brand voice</p>
                <p className="text-sm">{client.brandVoice}</p>
              </div>
            ) : null}
            {client.targetAudience ? (
              <div>
                <p className="text-xs text-muted-foreground">Target audience</p>
                <p className="text-sm">{client.targetAudience}</p>
              </div>
            ) : null}
            {client.commonServices ? (
              <div>
                <p className="text-xs text-muted-foreground">Services</p>
                <p className="text-sm">{client.commonServices}</p>
              </div>
            ) : null}
            {client.notes ? (
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteClientDialog
        clientId={client.id}
        clientName={client.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/clients")}
      />
      <LacrmConnectDialog
        clientId={client.id}
        clientName={client.name}
        open={lacrmOpen}
        onOpenChange={setLacrmOpen}
        onConnected={() => router.refresh()}
      />
    </div>
  )
}
