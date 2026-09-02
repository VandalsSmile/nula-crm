/**
 * Shared, client-safe helpers for contact document attachments. Imported by the
 * upload token route, the persist server action, and the client UI, so it must
 * not pull in any server-only code.
 */

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024 // 25MB
export const MAX_DOCUMENT_LABEL = "25MB"

/** Content types we accept for contact attachments (docs + common images). */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/rtf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
] as const

/** File-input `accept` value covering the same set by extension. */
export const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.rtf,.txt,.csv,.md,.zip,.png,.jpg,.jpeg,.webp,.gif,.heic"

export function isAllowedDocumentType(type: string): boolean {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(type)
}

/** Vercel Blob public URLs live on this host; used to validate stored URLs. */
export function isBlobUrl(url: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)
}

/** Human-readable size, e.g. "3.2 MB". Empty string for 0/unknown. */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return ""
  const units = ["B", "KB", "MB", "GB"]
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  const rounded = i === 0 ? Math.round(n) : n < 10 ? Math.round(n * 10) / 10 : Math.round(n)
  return `${rounded} ${units[i]}`
}

/** Short label for the file kind, derived from mime type or extension. */
export function documentKindLabel(mimeType: string, fileName = ""): string {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toUpperCase() : ""
  if (ext) return ext
  if (mimeType.includes("pdf")) return "PDF"
  if (mimeType.includes("word")) return "DOCX"
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLSX"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "PPTX"
  if (mimeType.startsWith("image/")) return mimeType.replace("image/", "").toUpperCase()
  if (mimeType.startsWith("text/")) return "TXT"
  return "FILE"
}
