import { AdminAccounts } from "@/components/admin/admin-accounts"
import { ProspectInvites } from "@/components/admin/prospect-invites"

export default function SystemDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage every workspace — set plans, comp accounts, extend trials, or suspend access.
        </p>
      </div>
      <AdminAccounts />
      <ProspectInvites />
    </div>
  )
}
