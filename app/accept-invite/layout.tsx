import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Accept invite",
  description: "Create your Nula CRM account and join your team workspace.",
  path: "/accept-invite",
  index: false,
})

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return children
}
