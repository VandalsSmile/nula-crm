"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { sendMessage } from "@/app/actions/messages"

/**
 * Compose and send an email to a contact. Available to any CRM user (send is
 * permitted for Owner/Admin/Member). Replies route back to the conversation via
 * the Reply-To routing in `sendMessage`.
 */
export function EmailContactDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
  contactEmail: string
}) {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  const hasEmail = Boolean(contactEmail?.trim())

  async function handleSend() {
    if (!hasEmail) return
    if (!body.trim()) {
      toast.error("Message body is required")
      return
    }
    setSending(true)
    try {
      const res = await sendMessage({
        contactId,
        channel: "email",
        subject: subject.trim() || undefined,
        body,
      })
      if (res.status === "sent") {
        toast.success(`Email sent to ${contactName}`)
      } else if (res.status === "queued") {
        toast.success("Email queued — it will send once email sending is configured.")
      } else if (res.status === "skipped") {
        toast.warning("This contact has no email address.")
      } else {
        toast.error(`Could not send (${res.status}).`)
      }
      setSubject("")
      setBody("")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email {contactName}</DialogTitle>
          <DialogDescription>
            {hasEmail
              ? "Send an email — their reply comes back to this contact's conversation."
              : "This contact has no email address yet. Add one on their profile first."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>To</FieldLabel>
            <Input value={contactEmail || "No email on file"} readOnly disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor="email-subject">Subject</FieldLabel>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              disabled={!hasEmail || sending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email-body">Message</FieldLabel>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Write to ${contactName}…`}
              rows={7}
              disabled={!hasEmail || sending}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !hasEmail || !body.trim()}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
