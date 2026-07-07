import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
