<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud

This is a **standalone workspace** for `jrpolan/nula-crm` — not VS Spackle.

- Environment setup: `docs/cursor-cloud-workspace.md`
- Install: `npm install && bash scripts/ensure-github-auth.sh`
- Dev: `npm run dev`
- Migrations: `npm run db:migrate` (requires `DATABASE_URL`)

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
