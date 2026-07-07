import type { MetadataRoute } from "next"

/**
 * SPACKLE is an internal VS Marketing tool — there is nothing here for search
 * engines to index, so we disallow all crawling across every user agent.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  }
}
