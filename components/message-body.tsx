import { htmlToPlainText, sanitizeEmailHtml } from "@/lib/email/sanitize"
import { cn } from "@/lib/utils"

const HTML_RE = /<[a-z][\s\S]*>/i

/** Whether a stored message body is HTML (vs. plain text). */
export function isHtmlBody(body: string | null | undefined): boolean {
  return !!body && HTML_RE.test(body)
}

/** A one-line, tag-free preview of a message body for list snippets. */
export function messagePreview(body: string | null | undefined): string {
  if (!body) return ""
  return (isHtmlBody(body) ? htmlToPlainText(body) : body).trim()
}

/**
 * Render a stored message body. HTML bodies (from the rich composer or inbound
 * email) are sanitized and rendered with formatting; plain-text bodies keep
 * their line breaks. Shared by the email view, inbox thread, and profile.
 */
export function MessageBody({ body, className }: { body: string | null | undefined; className?: string }) {
  if (!body?.trim()) return <span className="text-muted-foreground">(no content)</span>

  if (isHtmlBody(body)) {
    return (
      <div
        className={cn(
          "rte-content max-w-none text-sm leading-relaxed",
          "[&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold",
          "[&_a]:underline",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_p]:my-1.5",
          className,
        )}
        // Sanitized again at render time (defense-in-depth); bodies are also
        // sanitized before they're stored.
        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(body) }}
      />
    )
  }

  return <div className={cn("whitespace-pre-line text-sm leading-relaxed", className)}>{body}</div>
}
