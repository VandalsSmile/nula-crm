import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type IllustrationProps = {
  className?: string
  title?: string
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
        "relative overflow-hidden rounded-[1.75rem] border p-2 md:p-4",
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
