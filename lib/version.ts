import versionData from "@/version.json"

/** App release version shown in the UI (e.g. "1.5"). */
export const APP_VERSION = versionData.version

/**
 * Per-deploy build id (git SHA or build timestamp), inlined at build time via
 * next.config `env`. Changes on every deploy so the badge reflects the live build.
 */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID?.trim() || ""

/** Formatted for display (e.g. "v1.5·a1b2c3d"). */
export function formatAppVersion(version = APP_VERSION): string {
  return BUILD_ID ? `v${version}\u00b7${BUILD_ID}` : `v${version}`
}
