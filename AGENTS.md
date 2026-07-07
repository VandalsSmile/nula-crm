<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud

This is a **standalone workspace** for `VandalsSmile/nula-crm` — separate from the `vs-spackle` marketing platform.

### Cursor Cloud specific instructions

1. **Use the Nula environment only.** Create or select a Cursor Cloud environment bound to `VandalsSmile/nula-crm`. Do not run Nula agents from the `vandalssmile/vs-spackle` environment.
2. **Onboarding:** [Open guided setup](https://cursor.com/onboard?repository=https%3A%2F%2Fgithub.com%2FVandalsSmile%2Fnula-crm)
3. **Install hook:** `bash scripts/verify-nula-workspace.sh && npm install && bash scripts/ensure-github-auth.sh` (from `.cursor/environment.json`)
4. **Dev server:** `npm run dev` (also started via `start` in `environment.json`)
5. **Migrations:** `npm run db:migrate` (requires `DATABASE_URL` in Cursor Secrets)
6. **GitHub pushes:** `GH_TOKEN` must have **Contents: Read and write** on `VandalsSmile/nula-crm` and **SSO authorized** for the VandalsSmile org. Git commits use **Jason Polancich <jason@vs.marketing>**. See `docs/cursor-cloud-workspace.md`.

Full environment setup, secrets, and migration notes: `docs/cursor-cloud-workspace.md`

### Local dev database (when no `DATABASE_URL` secret is provided)

When no remote Neon `DATABASE_URL` secret is available, this VM runs a local PostgreSQL 16 instead. The Postgres install, the `nula_crm` database (user `nula`/`nula`), applied migrations, and `.env.local` all persist in the VM snapshot, so future agents normally only need to (re)start the DB.

- **Start Postgres** (not auto-started on boot): `sudo pg_ctlcluster 16 main start`. Verify with `pg_lsclusters`.
- **Local config** lives in `.env.local` (gitignored, snapshot-persisted): `DATABASE_URL=postgresql://nula:nula@localhost:5432/nula_crm` plus `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` set to `http://localhost:3000`.
- **`db:migrate` / `db:bootstrap` do not auto-load `.env.local`.** Run them with an explicit env file, e.g. `node --env-file=.env.local scripts/migrate.mjs` and `BOOTSTRAP_ADMIN_EMAIL=you@example.com node --env-file=.env.local scripts/bootstrap-invite.mjs`. `npm run dev` does load `.env.local` on its own.
- **First `/app/dashboard` load after a brand-new signup** can show "Something went wrong" — `seedWorkspaceDefaults()` calls `revalidatePath` during render (pre-existing app-code issue, unsupported in Next.js 16). Reload once; seeding completes and the dashboard renders normally.

## Product model

AI-first small business CRM. Core objects: **Contacts**, **Tags**, **Groups**, **Activities**, **Deals**, **Campaigns**.

- Tags describe facts; groups describe audiences.
- Every authenticated page includes the **AI command bar** (`components/ai-command-bar.tsx`).
- AI bulk actions use interpret → preview → approve → execute → undo (`app/actions/ai.ts`).

## Architecture

- Auth: better-auth, invite-only via `team_invites`
- DB: Drizzle + PostgreSQL, migrations in `scripts/migrations/`
- Workspace scoping: `getActingUser()` / `workspaceUserIdMatches()`
- Types: `lib/crm-types.ts`
- Defaults (IV therapy): `lib/crm-defaults.ts`, seeded via `seedWorkspaceDefaults()`

## Key routes

- `/` — marketing site
- `/login` — sign in
- `/app/dashboard` — stats + AI recommendations
- `/app/contacts`, `/app/contacts/[id]` — contact CRM + CSV import
- `/app/groups`, `/app/tags`, `/app/campaigns`, `/app/ai` — segmentation, campaigns, AI command center
- `/app/inbox`, `/app/reports` — Phase 4 stubs
- `/app/automations` — automation rules + inactive detection
- `POST /api/webhooks/leads` — lead intake (requires `LEAD_WEBHOOK_SECRET`)
- `GET /api/cron/automations` — daily inactive customer check (requires `CRON_SECRET`)

## Integrations

- **AI** (`AI_PROVIDER=anthropic|openai`) — command interpreter + lead summaries; regex fallback without keys
- **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) — campaign email sends
- **Lead webhook** — duplicate match, scoring, tags, groups, automations on intake
