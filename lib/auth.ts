import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

/** Sends a password-reset email via Resend (logs the link when unconfigured). */
async function sendResetPasswordEmail(email: string, url: string) {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Nula CRM <info@nulacrm.ai>"
  if (!key) {
    // Local/dev without Resend: log the link so it can still be used.
    console.log(`[auth] Password reset link for ${email}: ${url}`)
    return
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Reset your Nula password",
        html: `<p>We received a request to reset your Nula CRM password.</p><p><a href="${url}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`,
        text: `Reset your Nula CRM password: ${url}\n\nIf you didn't request this, ignore this email. This link expires in 1 hour.`,
      }),
    })
  } catch (error) {
    console.error("[auth] Failed to send reset email", error)
  }
}

export const auth = betterAuth({
  database: pool,
  // Sign-up is self-serve: a new account becomes its own workspace owner
  // (see resolveActingWorkspaceId). Teammates still join an existing workspace
  // via invite links, which bind them to the inviting workspace on accept
  // (see acceptTeamInvite).
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Forgot-password: emails a reset link that lands on /reset-password.
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url)
    },
  },
  trustedOrigins: [
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    // Allow local origins so the dev server / browser automation can sign in.
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // The v0 preview renders the app inside a cross-site iframe. Modern
          // Chrome (CHIPS / third-party cookie phase-out) drops the session
          // cookie on requests made from such an iframe UNLESS it is
          // SameSite=None; Secure; *and* Partitioned. Without `partitioned`,
          // sign-in succeeds but every later authed request (dashboard load,
          // image upload, etc.) sees no session and 401s.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
            partitioned: true,
          },
        },
      }
    : {}),
})
