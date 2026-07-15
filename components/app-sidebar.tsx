"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Layers,
  Tag,
  Megaphone,
  Inbox,
  Zap,
  Sparkles,
  BarChart3,
  BookOpen,
  Settings,
  ChevronsUpDown,
  ShieldAlert,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/logo"
import { InstallAppButton } from "@/components/install-app-button"
import { VersionBadge } from "@/components/version-badge"
import { initials } from "@/lib/crm-types"
import { useSessionUser } from "@/lib/session-context"
import { authClient } from "@/lib/auth-client"

import { APP_ROUTES } from "@/lib/routes"
const mainNav = [
  { title: "Dashboard", href: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { title: "Contacts", href: APP_ROUTES.contacts, icon: Users },
  { title: "Companies", href: APP_ROUTES.companies, icon: Building2 },
  { title: "Deals", href: APP_ROUTES.deals, icon: Briefcase },
  { title: "Groups", href: APP_ROUTES.groups, icon: Layers },
  { title: "Tags", href: APP_ROUTES.tags, icon: Tag },
  { title: "Campaigns", href: APP_ROUTES.campaigns, icon: Megaphone },
  { title: "Inbox", href: APP_ROUTES.inbox, icon: Inbox },
  { title: "Automations", href: APP_ROUTES.automations, icon: Zap },
  { title: "AI Command Center", href: APP_ROUTES.ai, icon: Sparkles },
  { title: "Reports", href: APP_ROUTES.reports, icon: BarChart3 },
  { title: "Help & docs", href: APP_ROUTES.help, icon: BookOpen },
  { title: "Settings", href: APP_ROUTES.settings, icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useSessionUser()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  async function handleLogout() {
    await authClient.signOut()
    router.push(APP_ROUTES.login)
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={APP_ROUTES.dashboard} className="flex items-center gap-2.5 px-2 py-1.5">
          <Logo className="size-9 shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-nula-ink dark:text-nula-paper">Nula CRM</span>
              <VersionBadge />
            </span>
            <span className="text-xs text-muted-foreground">AI-first small business CRM</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <InstallAppButton />
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8 rounded-lg">
                      {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                      <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem render={<Link href={APP_ROUTES.help}>Help &amp; docs</Link>} />
                  <DropdownMenuItem render={<Link href={APP_ROUTES.settings}>Settings</Link>} />
                  {user.isSuperAdmin ? (
                    <DropdownMenuItem
                      render={
                        <Link href="/dashboard">
                          <ShieldAlert />
                          System console
                        </Link>
                      }
                    />
                  ) : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
