"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AiActionPreviewDialog } from "@/components/ai-action-preview-dialog"
import { interpretAiCommand } from "@/app/actions/ai"
import type { AiActionPreview } from "@/lib/crm-types"

const SUGGESTIONS = [
  "Find duplicate contacts",
  "Normalize all tags",
  "Create a reactivation campaign for customers who haven't bought in 90 days",
  "Show me leads who never booked",
]

export function AiCommandBar({ className }: { className?: string }) {
  const router = useRouter()
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [preview, setPreview] = useState<AiActionPreview | null>(null)
  const [requiresApproval, setRequiresApproval] = useState(true)

  async function runCommand(text?: string) {
    const value = (text ?? command).trim()
    if (!value) return
    setLoading(true)
    try {
      const result = await interpretAiCommand(value)
      setActionId(result.actionId)
      setPreview(result.preview)
      setRequiresApproval(result.requiresApproval)
      if (result.requiresApproval) {
        setPreviewOpen(true)
      } else {
        toast.success(result.result?.summary ?? "Done")
        router.refresh()
      }
      setCommand("")
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
              placeholder="e.g. Move everyone who bought NAD into NAD Buyers group"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !command.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : "Run"}
            </Button>
          </form>
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
