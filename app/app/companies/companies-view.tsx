"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Globe, MapPin, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CompanyFormDialog } from "@/components/company-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { deleteCompany } from "@/app/actions/companies"
import { companyPath } from "@/lib/routes"
import type { Company } from "@/lib/crm-types"

export function CompaniesView({ companies }: { companies: Company[] }) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [, startTransition] = useTransition()

  function handleDelete(company: Company) {
    startTransition(async () => {
      try {
        await deleteCompany(company.id)
        toast.success(`Deleted ${company.name}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete company")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Companies"
        description="The organizations your contacts belong to."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add company
          </Button>
        }
      />

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No companies yet. Add one, or set a company when creating a contact.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    <Link href={companyPath(company.id)} className="truncate hover:underline">
                      {company.name}
                    </Link>
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={companyPath(company.id)} />}>
                      View company
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditCompany(company)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(company)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="size-4" />
                  {company.contactCount} {company.contactCount === 1 ? "contact" : "contacts"}
                </div>
                {company.city || company.state ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {[company.city, company.state].filter(Boolean).join(", ")}
                  </div>
                ) : null}
                {company.website ? (
                  <div className="flex items-center gap-2">
                    <Globe className="size-4" />
                    <span className="truncate">{company.website}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CompanyFormDialog open={addOpen} onOpenChange={setAddOpen} />
      {editCompany ? (
        <CompanyFormDialog
          open={!!editCompany}
          onOpenChange={(open) => !open && setEditCompany(null)}
          company={editCompany}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete company?"
        description={`Permanently remove ${deleteTarget?.name}? Its contacts will be kept but unlinked.`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
