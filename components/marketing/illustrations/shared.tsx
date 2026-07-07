import Image from "next/image"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type IllustrationProps = {
  className?: string
  title?: string
}

export const MARKETING_ILLUSTRATIONS = {
  hero: "/marketing/illustrations/hero.png",
  whatIsNula: "/marketing/illustrations/what-is-nula.png",
  whoItsFor: "/marketing/illustrations/who-its-for.png",
  whyNula: "/marketing/illustrations/why-nula.png",
  howWeHelp: "/marketing/illustrations/how-we-help.png",
  about: "/marketing/illustrations/about.png",
} as const

export function MarketingIllustration({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={900}
      priority={priority}
      className={cn("h-auto w-full", className)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
    />
  )
}

export function IllustrationFrame({
  className,
  children,
  variant = "light",
}: {
  className?: string
  children: ReactNode
  variant?: "light" | "dark" | "transparent"
}) {
  const bg =
    variant === "dark"
      ? "bg-transparent"
      : variant === "transparent"
        ? "bg-transparent"
        : "bg-[#FAF7F0]"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border p-2 md:p-3",
        variant === "dark" ? "border-white/15" : "border-[#E8DFD0]/80",
        bg,
        className,
      )}
    >
      {children}
    </div>
  )
}

export type { IllustrationProps }
