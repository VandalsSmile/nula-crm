import versionData from "@/version.json"

/** App release version shown in the UI (e.g. "1.5"). */
export const APP_VERSION = versionData.version

/** Formatted for display (e.g. "v1.5"). */
export function formatAppVersion(version = APP_VERSION): string {
  return `v${version}`
}
