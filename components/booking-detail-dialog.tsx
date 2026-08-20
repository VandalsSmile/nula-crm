"use client"

import Link from "next/link"
import { CalendarClock, MapPin, Pencil, Trash2, User } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { contactPath } from "@/lib/routes"
import { formatDateTime } from "@/lib/format"
import type { Booking } from "@/lib/crm-types"

export function BookingDetailDialog({
  booking,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  booking: Booking | null
  onOpenChange: (open: boolean) => void
  onEdit?: (booking: Booking) => void
  onDelete?: (booking: Booking) => void
}) {
  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent>
        {booking ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {booking.title}
                <Badge variant={booking.status === "canceled" ? "destructive" : "default"}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="size-4 shrink-0" />
                <span>
                  {booking.startAt ? formatDateTime(booking.startAt) : "No start time"}
                  {booking.endAt ? ` – ${formatDateTime(booking.endAt)}` : ""}
                </span>
              </div>
              {booking.location ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span className="break-all">{booking.location}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="size-4 shrink-0" />
                <span>
                  {booking.attendeeName || booking.contactName || "Attendee"}
                  {booking.attendeeEmail ? ` · ${booking.attendeeEmail}` : ""}
                </span>
              </div>
              {booking.source ? (
                <p className="text-xs text-muted-foreground">Source: {booking.source}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {booking.contactId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={contactPath(booking.contactId)} />}
                  >
                    View contact
                  </Button>
                ) : null}
                {onEdit ? (
                  <Button variant="outline" size="sm" onClick={() => onEdit(booking)}>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onDelete(booking)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
