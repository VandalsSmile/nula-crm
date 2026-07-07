import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { and, eq, gt } from "drizzle-orm"
import { pool, db } from "@/lib/db"
import { teamInvites } from "@/lib/db/schema"

export const auth = betterAuth({
  database: pool,
  // Registration is invite-only. Public sign-up stays open at the Better Auth
  // level, but the `before` hook below rejects any sign-up whose email does not
  // have a pending, unexpired team invite — so only invited teammates can join.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return
      const email = String(ctx.body?.email ?? "").trim().toLowerCase()
      if (!email) {
        throw new APIError("BAD_REQUEST", { message: "An email is required." })
      }
      const [invite] = await db
        .select({ id: teamInvites.id })
        .from(teamInvites)
        .where(
          and(
            eq(teamInvites.email, email),
            eq(teamInvites.status, "Pending"),
            gt(teamInvites.expiresAt, new Date()),
          ),
        )
        .limit(1)
      if (!invite) {
        throw new APIError("FORBIDDEN", {
          message: "Sign-up is invite-only. Ask an admin for an invite link.",
        })
      }
    }),
  },
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
