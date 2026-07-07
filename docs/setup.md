# Nula CRM setup

Standalone repo: **https://github.com/jrpolan/nula-crm**

For Cursor Cloud agents, use a dedicated environment (not VS Spackle). See **`docs/cursor-cloud-workspace.md`**.

## 1. Clone the repo

```bash
git clone https://github.com/jrpolan/nula-crm.git
cd nula-crm
npm install
```

## 2. Create a Neon database

1. Create a project at [https://neon.tech](https://neon.tech)
2. Copy the pooled PostgreSQL connection string
3. Set it as `DATABASE_URL`

## 3. Configure environment variables

### GitHub auth (Cursor Cloud agents)

Cursor Cloud injects `cursor[bot]` credentials that override your personal login. Each new agent run may require re-auth unless you add a **personal access token** to your Cursor Cloud environment:

1. Create a fine-grained PAT at [github.com/settings/tokens](https://github.com/settings/tokens) for `jrpolan/nula-crm` with **Contents: Read and write**
2. In Cursor → Cloud → Environment settings, add secret: `GH_TOKEN=<your-pat>`
3. The install hook runs `scripts/ensure-github-auth.sh` to use that token automatically

Without `GH_TOKEN`, run device login once per fresh VM:

```bash
gh auth login -h github.com -p https -s repo,read:org,gist
```

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random 32+ char secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Production app URL |
| `NEXT_PUBLIC_APP_URL` | Same as `BETTER_AUTH_URL` |
| `BLOB_READ_WRITE_TOKEN` | Optional, for brand logo uploads |

For Vercel, add the same values in **Project → Settings → Environment Variables**.

## 4. Run migrations

```bash
npm install
npm run db:migrate
```

## 5. Create the first admin invite

```bash
BOOTSTRAP_ADMIN_EMAIL=you@example.com npm run db:bootstrap
```

Open the printed `/accept-invite/...` URL, set your password, then use `/login`.

## 6. Deploy to Vercel

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel --prod
```

Or connect `jrpolan/nula-crm` in the Vercel dashboard and import the repo.

After the first deploy, update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain.

## 7. Cursor Cloud environment

Create a **dedicated** Cursor Cloud environment for this repo:

[Open guided environment setup](https://cursor.com/onboard?repository=https%3A%2F%2Fgithub.com%2Fjrpolan%2Fnula-crm)

See **`docs/cursor-cloud-workspace.md`** for secrets and migration notes from VS Spackle.

Add `GH_TOKEN`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` as Cursor secrets.
