import { describe, expect, it } from "vitest"

import {
  documentKindLabel,
  formatFileSize,
  isAllowedDocumentType,
  isBlobUrl,
  MAX_DOCUMENT_BYTES,
} from "@/lib/documents"

describe("isAllowedDocumentType", () => {
  it("accepts common document + image types", () => {
    expect(isAllowedDocumentType("application/pdf")).toBe(true)
    expect(
      isAllowedDocumentType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true)
    expect(isAllowedDocumentType("image/png")).toBe(true)
  })
  it("rejects unknown/dangerous types", () => {
    expect(isAllowedDocumentType("application/x-msdownload")).toBe(false)
    expect(isAllowedDocumentType("application/octet-stream")).toBe(false)
    expect(isAllowedDocumentType("")).toBe(false)
  })
})

describe("isBlobUrl", () => {
  it("accepts Vercel Blob public URLs only", () => {
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com/contact/doc.pdf")).toBe(true)
    expect(isBlobUrl("https://evil.example.com/doc.pdf")).toBe(false)
    expect(isBlobUrl("http://abc.public.blob.vercel-storage.com/x")).toBe(false) // must be https
  })
})

describe("formatFileSize", () => {
  it("formats bytes into human units", () => {
    expect(formatFileSize(0)).toBe("")
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(2048)).toBe("2 KB")
    expect(formatFileSize(1_572_864)).toBe("1.5 MB")
    expect(formatFileSize(MAX_DOCUMENT_BYTES)).toBe("25 MB")
  })
})

describe("documentKindLabel", () => {
  it("prefers the file extension, falls back to mime", () => {
    expect(documentKindLabel("application/pdf", "quote.PDF")).toBe("PDF")
    expect(documentKindLabel("application/pdf", "")).toBe("PDF")
    expect(
      documentKindLabel(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("DOCX")
    expect(documentKindLabel("image/png")).toBe("PNG")
  })
})
