"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * "Install app" affordance for the sidebar.
 * - Android/desktop Chrome: captures beforeinstallprompt and triggers the native install.
 * - iOS Safari: no prompt API, so we show the Share → Add to Home Screen hint.
 * - Renders nothing when already installed or when neither path applies.
 */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)

    // Deferred off the synchronous effect path.
    queueMicrotask(() => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      if (standalone) {
        setInstalled(true)
        return
      }
      const ua = window.navigator.userAgent
      setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window))
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed) return null
  if (!deferred && !isIOS) return null

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      try {
        await deferred.userChoice
      } catch {
        /* ignore */
      }
      setDeferred(null)
      return
    }
    // iOS: guide the manual add-to-home-screen flow.
    toast.info("Install Nula", {
      description: "Tap the Share icon, then choose \u201cAdd to Home Screen.\u201d",
      duration: 7000,
    })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={handleClick} tooltip="Install the Nula app">
        <Download />
        <span>Install app</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
