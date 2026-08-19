/**
 * Light sanitizer for rich-text email bodies produced by the in-app editor.
 * The author is a workspace admin composing their own marketing email (sent
 * from their own domain), so the goal is defense-in-depth against broken/unsafe
 * markup rather than untrusted-input XSS: strip scripts/styles/iframes, drop
 * inline event handlers, and neutralize javascript: URLs.
 */
export function sanitizeEmailHtml(input: string): string {
  if (!input) return ""
  let html = input
  // Remove dangerous element blocks entirely (including contents).
  html = html.replace(/<(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\/\1>/gi, "")
  html = html.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "")
  // Drop inline event handlers (on*="...", on*='...', on*=value).
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
  // Neutralize javascript:/data: URLs in href/src.
  html = html.replace(/(href|src)\s*=\s*"(\s*(?:javascript|data|vbscript):[^"]*)"/gi, '$1="#"')
  html = html.replace(/(href|src)\s*=\s*'(\s*(?:javascript|data|vbscript):[^']*)'/gi, "$1='#'")
  return html.trim()
}

/** Very small HTML→text reducer for the plain-text alternative part. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}
