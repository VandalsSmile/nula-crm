"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/format"
import { loadConversation, sendMessage } from "@/app/actions/messages"
import type { InboxConversation, Message } from "@/lib/crm-types"

export function InboxView({ conversations }: { conversations: InboxConversation[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(conversations[0]?.contactId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, startSending] = useTransition()

  useEffect(() => {
    let active = true
    // Defer off the synchronous effect path so state updates happen after render.
    queueMicrotask(() => {
      if (!active) return
      if (!selected) {
        setMessages([])
        return
      }
      setLoading(true)
      loadConversation(selected)
        .then((m) => {
          if (active) {
            setMessages(m)
            setLoading(false)
          }
        })
        .catch(() => active && setLoading(false))
    })
    return () => {
      active = false
    }
  }, [selected])

  const activeConv = conversations.find((c) => c.contactId === selected) ?? null

  function handleSend() {
    if (!reply.trim() || !selected) return
    const channel = activeConv?.lastChannel === "sms" ? "sms" : "email"
    startSending(async () => {
      try {
        const res = await sendMessage({ contactId: selected, channel, body: reply })
        setReply("")
        toast.success(res.status === "sent" ? "Message sent" : `Message logged (${res.status})`)
        setMessages(await loadConversation(selected))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send message")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inbox" description="Customer email and SMS conversations in one place." />

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No conversations yet. Inbound messages (from the messages webhook) and replies you send
            will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {conversations.map((c) => (
                <li key={c.contactId}>
                  <button
                    onClick={() => setSelected(c.contactId)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-muted/50",
                      selected === c.contactId && "bg-muted",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.contactName}</span>
                      {c.unread ? (
                        <Badge variant="default" className="text-[10px]">
                          New
                        </Badge>
                      ) : null}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {c.lastDirection === "outbound" ? "You: " : ""}
                      {c.lastMessage}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex min-h-[420px] flex-col">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">
                {activeConv?.contactName ?? "Select a conversation"}
              </p>
              {activeConv?.contactEmail ? (
                <p className="text-xs text-muted-foreground">{activeConv.contactEmail}</p>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      m.direction === "outbound"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-muted",
                    )}
                  >
                    {m.subject ? (
                      <p className="mb-0.5 text-xs font-semibold opacity-80">{m.subject}</p>
                    ) : null}
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.direction === "outbound"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {m.channel} · {relativeTime(m.createdAt)}
                      {m.direction === "outbound" && m.status !== "sent" ? ` · ${m.status}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>

            {selected ? (
              <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply…"
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sending || !reply.trim()}>
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  Send
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  )
}
