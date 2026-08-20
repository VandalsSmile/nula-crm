import type { NextConfig } from "next"

// A build identifier that changes on every deploy so the in-app version badge
// reflects the currently-live build. Prefer the git commit SHA (set by Vercel);
// fall back to the build timestamp when it isn't available.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  images: {
    remotePatterns: [
      // Vercel Blob — uploaded media lives on a per-store subdomain of
      // public.blob.vercel-storage.com. Without this allowlist the Next.js
      // Image optimizer rejects the remote URL and thumbnails render broken.
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
}

export default nextConfig
