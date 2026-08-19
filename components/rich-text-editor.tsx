"use client"

import { useEffect, useRef } from "react"
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Underline } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A dependency-free rich-text editor for email bodies. Uses a contentEditable
 * surface with a small toolbar (bold/italic/underline, H2, bullet/numbered
 * lists, links) and emits HTML. Output is sanitized server-side before it's
 * stored/sent (see lib/email/sanitize.ts).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Wrap typed lines in <p> blocks so block-level commands (headings) apply
  // reliably — otherwise the first, unwrapped line can't be turned into a heading.
  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p")
    } catch {
      // not supported — headings still work once the caret is inside a block
    }
  }, [])

  // Sync external value into the DOM only when it actually differs, so typing
  // doesn't reset the caret to the start.
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value || ""
  }, [value])

  function exec(command: string, arg?: string) {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    if (ref.current) onChange(ref.current.innerHTML)
  }

  /**
   * Toggle an H2 heading on the current line. `formatBlock` with a bare/unwrapped
   * first line is unreliable across browsers, so if it doesn't take we wrap the
   * caret's block manually.
   */
  function toggleHeading() {
    const el = ref.current
    if (!el) return
    el.focus()
    const before = el.innerHTML
    document.execCommand("formatBlock", false, "H2")
    if (el.innerHTML === before) {
      // Fallback: no block was converted (e.g. bare text node) — ensure a block
      // exists first, then retry.
      document.execCommand("formatBlock", false, "P")
      document.execCommand("formatBlock", false, "H2")
    }
    onChange(el.innerHTML)
  }

  function addLink() {
    const url = window.prompt("Link URL", "https://")
    if (url) exec("createLink", url)
  }

  // Keep focus/selection in the editor when a toolbar button is pressed —
  // otherwise clicking the button blurs the contentEditable and execCommand has
  // no selection to format.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault()

  const btn =
    "inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"

  return (
    <div className={cn("rounded-md border", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={() => exec("bold")} aria-label="Bold">
          <Bold className="size-4" />
        </button>
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={() => exec("italic")} aria-label="Italic">
          <Italic className="size-4" />
        </button>
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={() => exec("underline")} aria-label="Underline">
          <Underline className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={toggleHeading} aria-label="Heading">
          <Heading2 className="size-4" />
        </button>
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={() => exec("insertUnorderedList")} aria-label="Bulleted list">
          <List className="size-4" />
        </button>
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={() => exec("insertOrderedList")} aria-label="Numbered list">
          <ListOrdered className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn} onMouseDown={keepSelection} onClick={addLink} aria-label="Insert link">
          <Link2 className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        suppressContentEditableWarning
        className={cn(
          "rte-content min-h-48 max-w-none px-3 py-2.5 text-sm leading-relaxed outline-none",
          "[&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold",
          "[&_a]:text-primary [&_a]:underline",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_p]:my-1.5",
        )}
      />
    </div>
  )
}
