"use client"

import { useState } from "react"
import useSWR from "swr"
import { Copy, Check, Send, Mail, AlertCircle, MoreHorizontal, UserMinus } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSessionUser } from "@/lib/session-context"
import { initials } from "@/lib/mock-data"
import {
  ASSIGNABLE_ROLES,
  canManageMember,
  canManageTeam,
  type WorkspaceRole,
} from "@/lib/roles"
import {
  createTeamInvite,
  listTeamInvites,
  listTeamMembers,
  removeMember,
  resendTeamInvite,
  revokeTeamInvite,
  updateMemberRole,
  type TeamInvite,
  type TeamMember,
} from "@/app/actions/team"

type TeamData = { members: TeamMember[]; invites: TeamInvite[] }

const ROLE_OPTIONS = ASSIGNABLE_ROLES
type RoleOption = WorkspaceRole

async function fetchTeam(): Promise<TeamData> {
  const [members, invites] = await Promise.all([listTeamMembers(), listTeamInvites()])
  return { members, invites }
}

export function TeamSettings() {
  const me = useSessionUser()
  const canManage = canManageTeam(me.role)
  const { data, isLoading, mutate } = useSWR<TeamData>("team", fetchTeam)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<RoleOption>("Member")
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
      const invite = await createTeamInvite(trimmed, role)
      setLastInvite(invite)
      setCopied(false)
      setEmail("")
      if (invite.emailSent) {
        toast.success(`Invite sent to ${invite.email}`, {
          description: "They'll get an email with a link to join. You can also copy the link below.",
        })
      } else {
        // Email couldn't be sent (e.g. email isn't configured) — fall back to the
        // copyable link so the admin can still share it manually.
        try {
          await navigator.clipboard?.writeText(invite.url)
          setCopied(true)
        } catch {}
        toast.warning("Invite created, but the email couldn't be sent", {
          description: `Copy the link below and send it to ${invite.email}.`,
        })
      }
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invite")
    } finally {
      setInviting(false)
    }
  }

  async function handleResend(invite: TeamInvite) {
    try {
      const { emailSent } = await resendTeamInvite(invite.id)
      if (emailSent) {
        toast.success(`Invite re-sent to ${invite.email}`)
      } else {
        toast.warning("Couldn't send the email", {
          description: `Copy the invite link and send it to ${invite.email} instead.`,
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend invite")
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

  async function handleRoleChange(userId: string, newRole: WorkspaceRole) {
    try {
      await updateMemberRole(userId, newRole)
      toast.success("Role updated")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role")
    }
  }

  async function handleRemove(userId: string, name: string) {
    try {
      await removeMember(userId)
      toast.success(`${name} removed from the team`)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove member")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Invite by email (owners & admins only) */}
      {canManage && (
      <Card>
        <CardHeader>
          <CardTitle>Invite a teammate</CardTitle>
          <CardDescription>
            Enter their email and choose a role. We&apos;ll email them a private invite link to join
            this shared workspace — you can also copy the link to share it yourself.
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
            <Field className="sm:w-40">
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as RoleOption)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" disabled={inviting || !email.trim()}>
              <Send data-icon="inline-start" />
              {inviting ? "Sending…" : "Send invite"}
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
                Anyone with this link can join as {lastInvite.role}, so only share it with{" "}
                {lastInvite.email}. It expires in 14 days.
              </FieldDescription>
            </Field>
          )}
        </CardContent>
      </Card>
      )}

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
                  members.map((m) => {
                    const manageable = canManageMember({
                      actorRole: me.role,
                      targetRole: m.role,
                      isSelf: m.isYou,
                      targetIsOwner: m.isOwner,
                    })
                    return (
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
                          {manageable ? (
                            <Select
                              value={m.role}
                              onValueChange={(v) => v && handleRoleChange(m.id, v as WorkspaceRole)}
                            >
                              <SelectTrigger className="w-32" aria-label="Change role">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">{m.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.isOwner ? "default" : "secondary"}>
                            {m.isOwner ? "Owner" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {manageable && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon" aria-label="Member actions">
                                    <MoreHorizontal />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleRemove(m.id, m.name)}
                                >
                                  <UserMinus data-icon="inline-start" />
                                  Remove from team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}

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
                        <Badge variant="secondary">{inv.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Pending</Badge>
                      </TableCell>
                      <TableCell>
                        {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" aria-label="Invite actions">
                                <MoreHorizontal />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResend(inv)}>
                              <Mail data-icon="inline-start" />
                              Resend email
                            </DropdownMenuItem>
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
                        )}
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
