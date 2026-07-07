# nula-crm

Next.js CRM for managing client profiles with Less Annoying CRM (LACRM) integration.

## Stack

- Next.js 16 + React 19
- better-auth (invite-only team sign-up)
- Drizzle ORM + PostgreSQL
- shadcn/ui + Tailwind CSS v4

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First user

Sign-up is invite-only. For local development, insert a pending row in `team_invites` for your email, then register at `/login`.

## Cursor Cloud

Create a cloud development environment for this repo:

**[Open guided environment setup](https://cursor.com/onboard?repository=https%3A%2F%2Fgithub.com%2Fjrpolan%2Fnula-crm)**

Cloud agents use `.cursor/environment.json` for install/start commands. See `AGENTS.md` for agent-specific instructions.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Run migrations + production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Environment variables

See `.env.example` for required values:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — auth encryption secret
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — app URL
- `BLOB_READ_WRITE_TOKEN` — optional, for brand logo uploads
