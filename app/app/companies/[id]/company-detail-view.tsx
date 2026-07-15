"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Globe, Mail, MapPin, Pencil, Phone, Trash2, UserRound } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { LifecycleBadge } from "@/components/lifecycle-badge"
import { CompanyFormDialog } from "@/components/company-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { deleteCompany } from "@/app/actions/companies"
import { APP_ROUTES, contactPath } from "@/lib/routes"
import type { Company, Contact } from "@/lib/crm-types"

export function CompanyDetailView({
  company,
  contacts,
}: {
  company: Company
  contacts: Contact[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [, startTransition] = useTransition()

  const website = company.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : ""

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCompany(company.id)
        toast.success(`Deleted ${company.name}`)
        router.push(APP_ROUTES.companies)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete company")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={APP_ROUTES.companies}>Companies</Link>} />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{company.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title={company.name}
        description={`${company.contactCount} ${company.contactCount === 1 ? "contact" : "contacts"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-muted-foreground" />
              Company info
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {website ? (
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <a href={website} target="_blank" rel="noreferrer noopener" className="text-nula-violet hover:underline">
                  {company.website}
                </a>
              </div>
            ) : null}
            {company.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {company.phone}
              </div>
            ) : null}
            {company.address || company.city || company.state || company.zip ? (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                {[company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")}
              </div>
            ) : null}
            {company.notes ? (
              <>
                <Separator />
                <p className="text-muted-foreground">{company.notes}</p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No contacts linked to this company yet. Set this company on a contact to link it.
              </p>
            ) : (
              <div className="flex flex-col divide-y">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={contactPath(contact.id)}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.fullName}</span>
                      <LifecycleBadge stage={contact.lifecycleStage} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {contact.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3.5" />
                          {contact.email}
                        </span>
                      ) : null}
                      {contact.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3.5" />
                          {contact.phone}
                        </span>
                      ) : null}
                      {contact.ownerName ? (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5" />
                          {contact.ownerName}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CompanyFormDialog open={editOpen} onOpenChange={setEditOpen} company={company} />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete company?"
        description={`Permanently remove ${company.name}? Its contacts will be kept but unlinked.`}
        onConfirm={async () => handleDelete()}
      />
    </div>
  )
}
