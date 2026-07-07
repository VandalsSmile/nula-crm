"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { deleteClient } from "@/app/actions/clients"

export function DeleteClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onDeleted,
}: {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful delete (e.g. to navigate away from a profile). */
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const canDelete = confirm.trim() === clientName.trim() && !deleting

  function close(next: boolean) {
    if (!next) setConfirm("")
    onOpenChange(next)
  }

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    try {
      await deleteClient(clientId)
      toast.success("Client deleted", { description: clientName })
      setConfirm("")
      onOpenChange(false)
      if (onDeleted) onDeleted()
      else router.refresh()
    } catch (error) {
      toast.error("Could not delete client", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {clientName}?</DialogTitle>
          <DialogDescription>
            This permanently removes the client and its activity history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="confirm-name">
            Type <span className="font-semibold text-foreground">{clientName}</span> to confirm
          </FieldLabel>
          <Input
            id="confirm-name"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            placeholder={clientName}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canDelete) handleDelete()
            }}
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete}>
            {deleting ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
            Delete client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
