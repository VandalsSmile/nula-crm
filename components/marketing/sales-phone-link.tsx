import { SALES_PHONE_DISPLAY, SALES_PHONE_TEL } from "@/lib/marketing-schema"

export function SalesPhoneLink({ className }: { className?: string }) {
  return (
    <a href={`tel:${SALES_PHONE_TEL}`} className={className}>
      {SALES_PHONE_DISPLAY}
    </a>
  )
}
