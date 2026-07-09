"use client"

import { useState } from "react"
import useSWR from "swr"
import { MoreHorizontal, PauseCircle, PlayCircle, Clock } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAccounts,
  setAccountPlan,
  setSuspended,
  setTrialDays,
  type AdminAccount,
} from "@/app/actions/admin"

function planVariant(plan: string): "default" | "secondary" | "outline" | "destructive" {
  if (plan === "free") return "default"
  if (plan === "active") return "default"
  if (plan === "canceled") return "destructive"
  return "secondary"
}

export function AdminAccounts() {
  const { data, isLoading, mutate } = useSWR<AdminAccount[]>("admin-accounts", getAccounts)
  const [busy, setBusy] = useState<string | null>(null)
  const accounts = data ?? []

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id)
    try {
      await fn()
      toast.success(ok)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All accounts {accounts.length ? `(${accounts.length})` : ""}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Loading accounts…
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No accounts yet.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((a) => (
                  <TableRow key={a.workspaceId} className={a.suspended ? "opacity-60" : undefined}>
                    <TableCell>
                      <div className="font-medium">{a.ownerName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.ownerEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">{a.company || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={planVariant(a.plan)}>{a.planLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.plan === "trial" ? (
                        a.trialExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          `${a.trialDaysLeft}d left`
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.members}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.contacts}</TableCell>
                    <TableCell>
                      {a.suspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" aria-label="Account actions" disabled={busy === a.workspaceId}>
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Set plan</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                run(a.workspaceId, () => setAccountPlan(a.workspaceId, "free"), "Set to Free (comp)")
                              }
                            >
                              Free — no charge
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                run(a.workspaceId, () => setAccountPlan(a.workspaceId, "active"), "Set to Paid")
                              }
                            >
                              Paid (comp active)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                run(a.workspaceId, () => setAccountPlan(a.workspaceId, "trial"), "Reset to 7-day trial")
                              }
                            >
                              Reset 7-day trial
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() =>
                                run(a.workspaceId, () => setTrialDays(a.workspaceId, 30), "Trial extended 30 days")
                              }
                            >
                              <Clock data-icon="inline-start" />
                              Extend trial +30 days
                            </DropdownMenuItem>
                            {a.suspended ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  run(a.workspaceId, () => setSuspended(a.workspaceId, false), "Account reactivated")
                                }
                              >
                                <PlayCircle data-icon="inline-start" />
                                Reactivate account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  run(a.workspaceId, () => setSuspended(a.workspaceId, true), "Account suspended")
                                }
                              >
                                <PauseCircle data-icon="inline-start" />
                                Suspend account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
