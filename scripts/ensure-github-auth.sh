#!/usr/bin/env bash
# Ensures git/gh use your PAT — not cursor[bot] — for VandalsSmile/nula-crm.
set -euo pipefail

REPO_SLUG="${GITHUB_REPO:-VandalsSmile/nula-crm}"

echo "→ Ensuring GitHub auth for ${REPO_SLUG}..."

# VandalsSmile repo commits use the vs.marketing identity.
git config --global user.name "${GIT_AUTHOR_NAME:-Jason Polancich}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-jason@vs.marketing}"

# Cursor Cloud injects cursor[bot] token URL rewrites and exec-daemon credential helpers.
while IFS= read -r key; do
  git config --global --unset-all "$key" 2>/dev/null || true
done < <(git config --global --get-regexp '^url\..*github\.com.*\.insteadof' 2>/dev/null | awk '{print $1}' || true)

git config --global --unset-all credential.https://github.com.helper 2>/dev/null || true
git config --global --unset-all credential.https://gist.github.com.helper 2>/dev/null || true
git config --global credential.helper '!gh auth git-credential'
git config --global credential.https://github.com.helper '!gh auth git-credential'
git config --global credential.https://gist.github.com.helper '!gh auth git-credential'

# Prefer a long-lived PAT from Cursor Cloud secrets (recommended).
# GITHUB_PAT wins over GH_TOKEN when both are set (useful after rotating tokens).
token=""
for var in GITHUB_PAT GH_TOKEN GITHUB_TOKEN; do
  val="${!var:-}"
  if [[ -n "$val" && ${#val} -ge 40 ]]; then
    token="$val"
    break
  fi
done

if [[ -n "$token" ]]; then
  # When GH_TOKEN is set, gh CLI reads it directly and ignores stored credentials.
  # Unset during login so the new token is stored for git operations.
  GH_TOKEN_BACKUP="${GH_TOKEN:-}"
  unset GH_TOKEN
  printf '%s' "$token" | gh auth login --with-token 2>/dev/null || true
  gh auth switch -u "$(gh api user --jq .login 2>/dev/null)" 2>/dev/null || true
  export GH_TOKEN="${GH_TOKEN_BACKUP:-$token}"
elif ! gh auth status -h github.com &>/dev/null; then
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
email="$(gh api user --jq .email 2>/dev/null || echo unknown)"
echo "✓ GitHub auth ready: ${login} <${email}>"
echo "✓ Git author: $(git config --global user.name) <$(git config --global user.email)>"

# Org repos require SSO authorization on the PAT before git push works.
if [[ -d .git ]] && ! GIT_TERMINAL_PROMPT=0 git push --dry-run origin HEAD &>/dev/null; then
  push_err="$(GIT_TERMINAL_PROMPT=0 git push --dry-run origin HEAD 2>&1 || true)"
  if echo "$push_err" | rg -qi '403|denied|sso'; then
    echo ""
    echo "⚠ Git push to ${REPO_SLUG} is blocked for ${login}."
    echo "  Ensure your PAT has Contents: Read and write on ${REPO_SLUG}"
    echo "  and SSO is authorized: https://github.com/settings/tokens → Configure SSO → Authorize VandalsSmile"
    echo ""
  fi
fi
