# Nula CRM — dedicated Cursor Cloud workspace

Nula CRM runs in its **own** Cursor Cloud environment, separate from VS Spackle.

## Start a new Nula session (do this first)

If you previously ran Nula agents inside the VS Spackle workspace, start fresh:

1. **Create a new environment** — [Cursor Cloud onboarding for Nula CRM](https://cursor.com/onboard?repository=https%3A%2F%2Fgithub.com%2FVandalsSmile%2Fnula-crm)
2. **Verify the repo** — the environment must point at **`VandalsSmile/nula-crm`**, not `vandalssmile/vs-spackle`
3. **Name it clearly** — e.g. "Nula CRM" so it is easy to distinguish from Spackle
4. **Add secrets** (see table below) — use **environment-scoped** secrets so they do not leak into Spackle runs
5. **Authorize SSO on your PAT** — required for git push (see [GitHub SSO](#github-sso-for-vandalssmile))
6. **Start a new Cloud Agent** from that environment

An agent run still tied to `vs-spackle` will clone the wrong repo context even if `/workspace` was manually swapped. Always launch Nula work from the Nula environment.

## Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `GH_TOKEN` | Yes | GitHub PAT with **Contents: Read and write** on `VandalsSmile/nula-crm`, SSO authorized. Commits use **jason@vs.marketing**. |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | `https://nula-crm.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob for logo uploads |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Optional | AI command bar |
| `RESEND_API_KEY` | Optional | Campaign email sends |

## GitHub SSO for VandalsSmile

Fine-grained PATs need explicit SSO authorization before git push works on org repos.

1. Open [github.com/settings/tokens](https://github.com/settings/tokens)
2. Select your Nula PAT (the one stored as `GH_TOKEN`)
3. Click **Configure SSO** → **Authorize** next to **VandalsSmile**
4. Re-run an agent or `bash scripts/ensure-github-auth.sh` to verify

Without SSO authorization, agents can read the repo but get `403 Permission denied` on push.

## What the install hook does

`.cursor/environment.json` runs:

```bash
npm install && bash scripts/ensure-github-auth.sh
```

`scripts/ensure-github-auth.sh`:

- Clears Cursor's `cursor[bot]` git credential overrides
- Logs in with `GH_TOKEN` (or `GITHUB_PAT` / `GITHUB_TOKEN`)
- Sets git author to **Jason Polancich <jason@vs.marketing>**
- Sets `origin` to `https://github.com/VandalsSmile/nula-crm.git`
- Verifies git push access and prints SSO guidance if push fails

## Production

- **App:** https://nula-crm.vercel.app/
- **Repo:** https://github.com/VandalsSmile/nula-crm
- **Vercel project:** `nula-crm` (vs-marketing team)

## Migrating from VS Spackle

| Before | After |
|--------|-------|
| `vandalssmile/vs-spackle` workspace | `VandalsSmile/nula-crm` environment |
| Nula code mixed with Spackle | Nula code only in `nula-crm` repo |
| Shared secrets | Environment-scoped secrets for Nula |

- All Nula development happens in `VandalsSmile/nula-crm`
- Do **not** use `vs-spackle` branches for Nula work
- `scripts/publish-to-jrpolan.sh` is deprecated (one-time scaffold mirror)
