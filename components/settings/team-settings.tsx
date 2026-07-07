"use client"

import { useState } from "react"
import useSWR from "swr"
import { Copy, Check, PlusIcon, AlertCircle, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/mock-data"
import {
  createTeamInvite,
  listTeamInvites,
  listTeamMembers,
  revokeTeamInvite,
  type TeamInvite,
  type TeamMember,
} from "@/app/actions/team"

type TeamData = { members: TeamMember[]; invites: TeamInvite[] }

async function fetchTeam(): Promise<TeamData> {
  const [members, invites] = await Promise.all([listTeamMembers(), listTeamInvites()])
  return { members, invites }
}

export function TeamSettings() {
  const { data, isLoading, mutate } = useSWR<TeamData>("team", fetchTeam)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [lastInvite, setLastInvite] = useState<TeamInvite | null>(null)
  const [copied, setCopied] = useState(false)

  const members = data?.members ?? []
  // Only pending, unexpired invites are actionable; accepted ones show as members.
  const pendingInvites = (data?.invites ?? []).filter((i) => i.status === "Pending" && !i.expired)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setInviting(true)
    try {
      const invite = await createTeamInvite(trimmed)
      setLastInvite(invite)
      setCopied(false)
      setEmail("")
      // Best-effort auto-copy so the admin can paste the link straight away.
      try {
        await navigator.clipboard?.writeText(invite.url)
        setCopied(true)
        toast.success("Invite link created and copied", {
          description: `Send it to ${invite.email} to let them join.`,
        })
      } catch {
        toast.success("Invite link created", { description: `Copy the link below to send to ${invite.email}.` })
      }
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invite")
    } finally {
      setInviting(false)
    }
  }

  function copyLink(url: string) {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    toast.success("Invite link copied")
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleRevoke(token: string) {
    try {
      await revokeTeamInvite(token)
      if (lastInvite?.id === token) setLastInvite(null)
      toast.success("Invite revoked")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke invite")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Invite by email */}
      <Card>
        <CardHeader>
          <CardTitle>Invite a teammate</CardTitle>
          <CardDescription>
            Enter their email to generate a private invite link. Send it to them and they&apos;ll join
            this shared workspace as an admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field className="flex-1">
              <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@vsmarketing.com"
                  autoComplete="off"
                />
              </InputGroup>
            </Field>
            <Button type="submit" disabled={inviting || !email.trim()}>
              <PlusIcon data-icon="inline-start" />
              {inviting ? "Generating…" : "Generate invite"}
            </Button>
          </form>

          {lastInvite && (
            <Field>
              <FieldLabel htmlFor="invite-link">Invite link for {lastInvite.email}</FieldLabel>
              <InputGroup>
                <InputGroupInput id="invite-link" readOnly value={lastInvite.url} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => copyLink(lastInvite.url)}
                    aria-label="Copy invite link"
                  >
                    {copied ? <Check /> : <Copy />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Anyone with this link can join as an admin, so only share it with {lastInvite.email}.
                It expires in 14 days.
              </FieldDescription>
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Members + pending invites */}
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>Everyone with access to this shared workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Loading team…
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            {m.image && <AvatarImage src={m.image} alt="" />}
                            <AvatarFallback>{initials(m.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {m.name}
                              {m.isYou && <span className="text-muted-foreground"> (you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Admin</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.isOwner ? "default" : "secondary"}>
                          {m.isOwner ? "Owner" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))}

                {!isLoading &&
                  pendingInvites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>{initials(inv.email)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">Invited by {inv.invitedByName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Admin</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Pending</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" aria-label="Invite actions">
                                <MoreHorizontal />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyLink(inv.url)}>
                              <Copy data-icon="inline-start" />
                              Copy invite link
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => handleRevoke(inv.id)}>
                              <AlertCircle data-icon="inline-start" />
                              Revoke invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
