"use client"

import { useEffect } from "react"

/**
 * Top-level error boundary that catches failures in the root layout itself.
 * Next.js renders this INSTEAD of the root layout, so it must provide its own
 * <html>/<body> and cannot rely on app providers, fonts, or theme context —
 * styles are kept inline so it renders even if the stylesheet failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log("[v0] global error:", error.message, error.digest)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ lineHeight: 1.6, color: "#a1a1aa", margin: "0 0 1.5rem" }}>
            A critical error occurred while loading the app. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#fafafa",
              color: "#000000",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
