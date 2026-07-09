"use client"

import { useState } from "react"
import useSWR from "swr"
import { Check, Copy, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createProspectInvite,
  listProspectInvites,
  revokeProspectInvite,
  type ProspectInvite,
} from "@/app/actions/admin"

export function ProspectInvites() {
  const { data, isLoading, mutate } = useSWR<ProspectInvite[]>("prospect-invites", listProspectInvites)
  const [email, setEmail] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const invites = data ?? []

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setCreating(true)
    try {
      const invite = await createProspectInvite(email.trim())
      setEmail("")
      try {
        await navigator.clipboard?.writeText(invite.url)
        toast.success("Prospect invite created & link copied", {
          description: `Send it to ${invite.email} to start their trial account.`,
        })
      } catch {
        toast.success("Prospect invite created")
      }
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invite")
    } finally {
      setCreating(false)
    }
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error("Could not copy")
    }
  }

  async function revoke(id: string) {
    try {
      await revokeProspectInvite(id)
      toast.success("Invite revoked")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke")
    }
  }

  const pending = invites.filter((i) => i.status === "Pending" && !i.expired)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prospect trial invites</CardTitle>
        <CardDescription>
          Send a link that spins up a brand‑new trial account for a prospective customer.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prospect@company.com"
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={creating || !email.trim()}>
            <Plus className="size-4" />
            {creating ? "Creating…" : "Create invite"}
          </Button>
        </form>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No prospect invites yet.
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === "Accepted"
                            ? "default"
                            : inv.expired || inv.status === "Revoked"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {inv.expired && inv.status === "Pending" ? "Expired" : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => copy(inv.url, inv.id)}>
                          {copied === inv.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                          Copy link
                        </Button>
                        {inv.status === "Pending" && !inv.expired ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Revoke invite"
                            onClick={() => revoke(inv.id)}
                          >
                            <Trash2 className="size-4 text-muted-foreground" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pending.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {pending.length} pending invite{pending.length === 1 ? "" : "s"} · links expire in 14 days.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
