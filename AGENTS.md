<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build (requires `DATABASE_URL` on CI/Vercel): `npm run build`

### Architecture

- Auth: better-auth with invite-only sign-up via `team_invites`
- Database: Drizzle + PostgreSQL; migrations in `scripts/migrations/`
- Multi-tenancy: workspace-scoped via `lib/workspace-scope.ts` and `getActingUser()`
- Mutations: Server Actions in `app/actions/`
- Reads: `lib/queries.ts` from Server Components

### Key routes

- `/dashboard` — workspace overview
- `/clients` — client list and profiles
- `/settings` — profile, security, team invites
