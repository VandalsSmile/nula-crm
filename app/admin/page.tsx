import { redirect } from "next/navigation"

// Convenience alias — the system console lives at /dashboard.
export default function AdminAlias() {
  redirect("/dashboard")
}
