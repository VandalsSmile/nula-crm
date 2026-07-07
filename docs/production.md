# Nula CRM — production setup (completed)

## Live URLs

| Resource | URL |
|----------|-----|
| Production app | https://nula-crm.vercel.app |
| Vercel project | https://vercel.com/vs-marketing/nula-crm |
| GitHub repo | https://github.com/jrpolan/nula-crm |

## Database (Neon)

- **Database name:** `nula_crm` (on the VS Marketing Neon project)
- **Migrations:** applied via `scripts/migrations/001_init.sql`
- **Connection:** configured as `DATABASE_URL` in Vercel (production/preview/development)

## Vercel environment variables

Set on **vs-marketing/nula-crm** for all environments:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` → `https://nula-crm.vercel.app`
- `NEXT_PUBLIC_APP_URL` → `https://nula-crm.vercel.app`
- `BLOB_READ_WRITE_TOKEN`

## First admin

Bootstrap invite created for **jason@vs.marketing**. Run again if needed:

```bash
BOOTSTRAP_ADMIN_EMAIL=jason@vs.marketing \
NEXT_PUBLIC_APP_URL=https://nula-crm.vercel.app \
npm run db:bootstrap
```

## Cursor Cloud environment

1. Open [guided setup](https://cursor.com/onboard?repository=https%3A%2F%2Fgithub.com%2Fjrpolan%2Fnula-crm)
2. Add secrets matching Vercel production values:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `BLOB_READ_WRITE_TOKEN` (optional, for brand logo uploads)
3. The committed `.cursor/environment.json` runs `npm install` and `npm run dev`

## Local development

```bash
cp .env.example .env.local
# Copy production values from: vercel env pull .env.local --environment development
npm install
npm run db:migrate
npm run dev
```
