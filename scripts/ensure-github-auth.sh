#!/usr/bin/env bash
# Ensures git/gh use your PAT — not cursor[bot] — in Cursor Cloud agents.
set -euo pipefail

REPO_SLUG="${GITHUB_REPO:-VandalsSmile/nula-crm}"

echo "→ Ensuring GitHub auth for ${REPO_SLUG}..."

# Cursor Cloud injects cursor[bot] token URL rewrites that override gh credentials.
while IFS= read -r key; do
  git config --global --unset-all "$key" 2>/dev/null || true
done < <(git config --global --get-regexp '^url\..*github\.com.*\.insteadof' 2>/dev/null | awk '{print $1}' || true)

git config --global credential.helper '!gh auth git-credential'
git config --global user.name "${GIT_AUTHOR_NAME:-Jason Polancich}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-jason@vs.marketing}"

# Prefer a long-lived PAT from Cursor Cloud secrets (recommended).
# Also accept GITHUB_PAT / GITHUB_TOKEN if GH_TOKEN conflicts with Cursor's integration token.
for var in GH_TOKEN GITHUB_PAT GITHUB_TOKEN; do
  if [[ -n "${!var:-}" ]]; then
    printf '%s' "${!var}" | gh auth login --with-token 2>/dev/null || true
    gh auth switch -u "$(gh api user --jq .login 2>/dev/null)" 2>/dev/null || true
    break
  fi
done

if ! gh auth status -h github.com &>/dev/null; then
  echo "⚠ Not logged into GitHub. Run: gh auth login -h github.com -p https -s repo,read:org,gist"
  echo "  Or add GH_TOKEN (PAT) to your Cursor Cloud environment secrets."
  exit 0
fi

gh config set -h github.com git_protocol https 2>/dev/null || true
gh auth setup-git 2>/dev/null || true

if [[ -d .git ]]; then
  git remote set-url origin "https://github.com/${REPO_SLUG}.git" 2>/dev/null || true
fi

login="$(gh api user --jq .login 2>/dev/null || echo unknown)"
echo "✓ GitHub auth ready: ${login}"

# Org repos require SSO authorization on the PAT before git push works.
if [[ -d .git ]] && ! GIT_TERMINAL_PROMPT=0 git push --dry-run origin HEAD &>/dev/null; then
  push_err="$(GIT_TERMINAL_PROMPT=0 git push --dry-run origin HEAD 2>&1 || true)"
  if echo "$push_err" | rg -qi '403|denied|sso'; then
    echo ""
    echo "⚠ Git push to ${REPO_SLUG} is blocked for account ${login}."
    echo "  Authorize SSO on your PAT for the VandalsSmile org:"
    echo "    https://github.com/settings/tokens → Configure SSO → Authorize VandalsSmile"
    echo ""
  fi
fi
