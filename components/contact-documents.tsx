"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"
import {
  Download,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { addContactDocument, deleteContactDocument } from "@/app/actions/documents"
import { useWriteGuard } from "@/lib/use-write-guard"
import { formatDateTime } from "@/lib/format"
import {
  DOCUMENT_ACCEPT,
  documentKindLabel,
  formatFileSize,
  isAllowedDocumentType,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_LABEL,
} from "@/lib/documents"
import type { ContactDocument } from "@/lib/crm-types"

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return FileSpreadsheet
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType.startsWith("text/"))
    return FileText
  return FileIcon
}

export function ContactDocuments({
  contactId,
  documents,
}: {
  contactId: string
  documents: ContactDocument[]
}) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContactDocument | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!guardWrite()) return
    if (file.type && !isAllowedDocumentType(file.type)) {
      toast.error("That file type isn't supported")
      return
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(`File too large (max ${MAX_DOCUMENT_LABEL})`)
      return
    }

    setUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        contentType: file.type || undefined,
        handleUploadUrl: `/api/contacts/${contactId}/documents/upload`,
      })
      await addContactDocument({
        contactId,
        url: blob.url,
        pathname: blob.pathname,
        fileName: file.name,
        mimeType: file.type || "",
        sizeBytes: file.size,
      })
      toast.success("Document attached")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload document")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteContactDocument(deleteTarget.id)
    toast.success("Document removed")
    router.refresh()
  }

  return (
    <Card id="documents" className="scroll-mt-24">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          Documents
        </CardTitle>
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="hidden"
          onChange={handleFile}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Upload data-icon="inline-start" />
          )}
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Attach a PDF, Word doc, spreadsheet, or image (max {MAX_DOCUMENT_LABEL}).
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => {
              const Icon = iconFor(doc.mimeType)
              const meta = [
                documentKindLabel(doc.mimeType, doc.fileName),
                formatFileSize(doc.sizeBytes),
                formatDateTime(doc.createdAt),
                doc.uploadedByName ? `by ${doc.uploadedByName}` : "",
              ]
                .filter(Boolean)
                .join(" · ")
              return (
                <li key={doc.id} className="flex items-center gap-3 py-3">
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium hover:underline"
                      title={doc.fileName}
                    >
                      {doc.fileName}
                    </a>
                    <p className="truncate text-xs text-muted-foreground">{meta}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                        <Download />
                      </a>
                    }
                    aria-label={`Download ${doc.fileName}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => guardWrite() && setDeleteTarget(doc)}
                    aria-label={`Remove ${doc.fileName}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove document?"
        description={`Permanently remove "${deleteTarget?.fileName}" from this contact?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
    </Card>
  )
}
