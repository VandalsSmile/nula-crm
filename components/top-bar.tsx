"use client"

import { usePathname } from "next/navigation"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { APP_BASE, APP_ROUTES } from "@/lib/routes"

const titles: Record<string, string> = {
  [APP_ROUTES.dashboard]: "Dashboard",
  [APP_ROUTES.contacts]: "Contacts",
  [APP_ROUTES.groups]: "Groups",
  [APP_ROUTES.campaigns]: "Campaigns",
  [APP_ROUTES.inbox]: "Inbox",
  [APP_ROUTES.automations]: "Automations",
  [APP_ROUTES.ai]: "AI Command Center",
  [APP_ROUTES.reports]: "Reports",
  [APP_ROUTES.settings]: "Settings",
}

function deriveTitle(pathname: string) {
  if (pathname.startsWith(`${APP_ROUTES.contacts}/`)) return "Contact Profile"
  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return title
  }
  return "Nula CRM"
}

export function TopBar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const title = deriveTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-6" />
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="ml-auto">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>
      </div>
    </header>
  )
}
