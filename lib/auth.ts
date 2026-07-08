import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

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
    // Registration is gated by the invite-only `before` hook above, not by
    // disableSignUp — invited teammates must be able to complete sign-up.
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
