import type { Activity } from "@/lib/crm-types"
import { companyPath, contactPath } from "@/lib/routes"

const EMAIL_TYPES = new Set(["email_sent", "email_received", "email_opened", "link_clicked"])

/**
 * Where a recent-activity row should link, if anywhere.
 *
 * - Emails deep-link to the specific message on the contact page (which opens it).
 * - Other email-type rows without a stored reference jump to the contact's Emails
 *   section.
 * - When context is shown (e.g. the dashboard), any row links to the contact or
 *   company it belongs to. On the contact timeline (no context) we only link
 *   email rows, since linking every row back to the same page is noise.
 */
export function activityHref(a: Activity, showContext: boolean): string | null {
  if (a.refType === "message" && a.refId && a.contactId) {
    return `${contactPath(a.contactId)}?email=${encodeURIComponent(a.refId)}`
  }
  if (EMAIL_TYPES.has(a.type) && a.contactId) {
    return `${contactPath(a.contactId)}#emails`
  }
  if (!showContext) return null
  if (a.contactId) return contactPath(a.contactId)
  if (a.companyId) return companyPath(a.companyId)
  return null
}
