"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, Search, Send, User } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageBody, messagePreview } from "@/components/message-body"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/format"
import { contactPath } from "@/lib/routes"
import { initials } from "@/lib/crm-types"
import { loadConversation, sendMessage } from "@/app/actions/messages"
import type { InboxConversation, Message } from "@/lib/crm-types"

export function InboxView({ conversations }: { conversations: InboxConversation[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(conversations[0]?.contactId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState("")
  const [query, setQuery] = useState("")
  const [sending, startSending] = useTransition()
  const threadRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.contactName.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q) ||
        messagePreview(c.lastMessage).toLowerCase().includes(q),
    )
  }, [conversations, query])

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

  // Keep the thread pinned to the latest message as it loads / grows.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const activeConv = conversations.find((c) => c.contactId === selected) ?? null

  function handleSend() {
    if (!reply.trim() || !selected) return
    // Email-only for now (SMS is hidden until we ship a provider).
    const channel = "email" as const
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
      <PageHeader title="Inbox" description="Customer email conversations in one place." />

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No conversations yet. Emails you send to contacts, and their replies, will show up here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {/* Conversation list — hidden on mobile once a thread is open. */}
          <Card className={cn("overflow-hidden", selected && "hidden md:block")}>
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations…"
                  className="h-9 pl-8"
                  aria-label="Search conversations"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No conversations match “{query}”.
              </p>
            ) : (
              <ul className="max-h-[70vh] divide-y overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.contactId}>
                    <button
                      onClick={() => setSelected(c.contactId)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                        selected === c.contactId && "bg-muted",
                      )}
                    >
                      <Avatar className="mt-0.5">
                        <AvatarFallback className="text-xs">
                          {initials(c.contactName) || <User className="size-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              c.unread ? "font-semibold text-foreground" : "font-medium",
                            )}
                          >
                            {c.contactName}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(c.lastAt)}
                          </span>
                        </span>
                        {c.contactEmail ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.contactEmail}
                          </span>
                        ) : null}
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-xs",
                              c.unread ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {c.lastDirection === "outbound" ? "You: " : ""}
                            {messagePreview(c.lastMessage) || "(no content)"}
                          </span>
                          {c.unread ? (
                            <Badge variant="default" className="ml-auto shrink-0 text-[10px]">
                              New
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className={cn("flex min-h-[460px] flex-col", !selected && "hidden md:flex")}>
            {activeConv ? (
              <>
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden"
                    aria-label="Back to conversations"
                    onClick={() => setSelected(null)}
                  >
                    <ArrowLeft />
                  </Button>
                  <Avatar size="sm">
                    <AvatarFallback className="text-xs">
                      {initials(activeConv.contactName) || <User className="size-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={contactPath(activeConv.contactId)}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {activeConv.contactName}
                    </Link>
                    {activeConv.contactEmail ? (
                      <p className="truncate text-xs text-muted-foreground">{activeConv.contactEmail}</p>
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" render={<Link href={contactPath(activeConv.contactId)} />}>
                    <User data-icon="inline-start" />
                    Profile
                  </Button>
                </div>

                <div ref={threadRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
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
                        <MessageBody body={m.body} />
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

                <div className="flex items-end gap-2 border-t p-3">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Type a reply…  (⌘/Ctrl + Enter to send)"
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="animate-spin" /> : <Send />}
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
                <Mail className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a conversation to read and reply.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
