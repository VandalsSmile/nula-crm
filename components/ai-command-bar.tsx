"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  Loader2,
  Search,
  Sparkles,
  Tag as TagIcon,
  User,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AiActionPreviewDialog } from "@/components/ai-action-preview-dialog"
import { interpretAiCommand } from "@/app/actions/ai"
import { APP_ROUTES } from "@/lib/routes"
import type { AiActionPreview, AiSearchHit } from "@/lib/crm-types"

const SUGGESTIONS = [
  "Find duplicate contacts",
  "Clean up duplicate tags",
  "Create a win-back campaign for customers who haven't bought in 90 days",
  "Show me leads who never replied",
]

const HIT_ICON = {
  contact: User,
  company: Building2,
  deal: CircleDollarSign,
  group: Users,
  tag: TagIcon,
} as const

const HIT_LABEL = {
  contact: "Contact",
  company: "Company",
  deal: "Deal",
  group: "Group",
  tag: "Tag",
} as const

export function AiCommandBar({ className }: { className?: string }) {
  const router = useRouter()
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [preview, setPreview] = useState<AiActionPreview | null>(null)
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [results, setResults] = useState<AiSearchHit[] | null>(null)
  const [resultQuery, setResultQuery] = useState("")

  async function runCommand(text?: string) {
    const value = (text ?? command).trim()
    if (!value) return
    setLoading(true)
    setResults(null)
    try {
      const result = await interpretAiCommand(value)
      setActionId(result.actionId)
      setPreview(result.preview)
      setRequiresApproval(result.requiresApproval)

      if (result.requiresApproval) {
        setPreviewOpen(true)
        setCommand("")
      } else if (result.result && result.result.hits !== undefined) {
        // A CRM search — show clickable results inline; keep the query visible.
        setResults(result.result.hits)
        setResultQuery(value)
      } else {
        toast.success(result.result?.summary ?? "Done")
        router.refresh()
        setCommand("")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run command")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={className}>
        <div className="flex flex-col gap-2 rounded-xl border border-primary/15 bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-nula-signal" />
            <span className="text-sm font-medium">What do you want to do?</span>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              runCommand()
            }}
          >
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Search a contact/company/deal, or ask Nula to do something…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !command.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : "Run"}
            </Button>
          </form>

          {results !== null ? (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
                <span className="truncate text-xs text-muted-foreground">
                  {results.length
                    ? `${results.length} result${results.length === 1 ? "" : "s"} for "${resultQuery}"`
                    : `No matches for "${resultQuery}"`}
                </span>
                <button
                  type="button"
                  aria-label="Clear results"
                  onClick={() => setResults(null)}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {results.length ? (
                <ul className="max-h-80 overflow-y-auto">
                  {results.map((hit) => {
                    const Icon = HIT_ICON[hit.type]
                    return (
                      <li key={`${hit.type}:${hit.id}`}>
                        <Link
                          href={hit.href}
                          onClick={() => setResults(null)}
                          className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{hit.label}</div>
                            {hit.subtitle ? (
                              <div className="truncate text-xs text-muted-foreground">{hit.subtitle}</div>
                            ) : null}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {HIT_LABEL[hit.type]}
                          </Badge>
                        </Link>
                      </li>
                    )
                  })}
                  <li className="border-t">
                    <Link
                      href={`${APP_ROUTES.contacts}?q=${encodeURIComponent(resultQuery)}`}
                      onClick={() => setResults(null)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-primary transition-colors hover:bg-muted/50"
                    >
                      <Search className="size-4" />
                      Search all contacts for “{resultQuery}”
                      <ArrowRight className="ml-auto size-4" />
                    </Link>
                  </li>
                </ul>
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nothing in your CRM matched. Try a name, email, company, or deal — or{" "}
                  <Link
                    href={`${APP_ROUTES.contacts}?q=${encodeURIComponent(resultQuery)}`}
                    onClick={() => setResults(null)}
                    className="text-primary hover:underline"
                  >
                    search all contacts
                  </Link>
                  .
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runCommand(s)}
                  className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && actionId ? (
        <AiActionPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          actionId={actionId}
          preview={preview}
          requiresApproval={requiresApproval}
          onComplete={() => router.refresh()}
        />
      ) : null}
    </>
  )
}
