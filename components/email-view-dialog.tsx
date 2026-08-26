"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateTime } from "@/lib/format"
import type { Message } from "@/lib/crm-types"

/** Read-only view of a single email (sent or received) with its full body. */
export function EmailViewDialog({
  open,
  onOpenChange,
  email,
  contactName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: Message | null
  contactName: string
}) {
  const outbound = email?.direction === "outbound"
  const meta = email
    ? [
        outbound ? `Sent to ${contactName}` : `Received from ${contactName}`,
        formatDateTime(email.createdAt),
        outbound && email.status && !["sent", "logged"].includes(email.status) ? email.status : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{email?.subject?.trim() || "(no subject)"}</DialogTitle>
          <DialogDescription>{meta}</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto whitespace-pre-line px-1 text-sm leading-relaxed">
          {email?.body?.trim() ? email.body : "(no content)"}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
