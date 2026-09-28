import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getTargetListById } from "@/lib/queries"
import { listContactOptions } from "@/app/actions/contacts"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES, targetListPath } from "@/lib/routes"
import { TargetListDetailView } from "./target-list-detail-view"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const data = await getTargetListById(id)
  const name = data?.list.name ?? "Target list"
  return appPageMetadata(name, `Work the ${name} target list — outreach status and progress.`, targetListPath(id))
}

export default async function TargetListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTargetListById(id)
  if (!data) notFound()
  const contactOptions = await listContactOptions()

  return (
    <TargetListDetailView
      list={data.list}
      members={data.members}
      contactOptions={contactOptions}
      backHref={APP_ROUTES.lists}
    />
  )
}
