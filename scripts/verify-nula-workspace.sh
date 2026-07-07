#!/usr/bin/env bash
# Verifies this agent is running in the Nula CRM workspace, not VS Spackle.
set -euo pipefail

EXPECTED_REPO="${GITHUB_REPO:-VandalsSmile/nula-crm}"
EXPECTED_SLUG="nula-crm"
issues=0

warn() {
  echo "⚠ $*"
  issues=$((issues + 1))
}

ok() {
  echo "✓ $*"
}

if [[ -f package.json ]] && command -v node &>/dev/null; then
  pkg_name="$(node -p "require('./package.json').name" 2>/dev/null || echo unknown)"
  if [[ "$pkg_name" != "$EXPECTED_SLUG" ]]; then
    warn "package.json name is '${pkg_name}' (expected '${EXPECTED_SLUG}')"
  else
    ok "package.json name is ${EXPECTED_SLUG}"
  fi
fi

if [[ -d .git ]]; then
  origin="$(git remote get-url origin 2>/dev/null || echo missing)"
  if echo "$origin" | rg -qi 'vs-spackle|vandalssmile/vs-spackle'; then
    warn "git origin points at VS Spackle: ${origin}"
    warn "Start Nula agents from the VandalsSmile/nula-crm Cursor Cloud environment"
  elif echo "$origin" | rg -qi "${EXPECTED_REPO}|VandalsSmile/nula-crm"; then
    ok "git origin is VandalsSmile/nula-crm"
  else
    warn "git origin is unexpected: ${origin}"
  fi
fi

if [[ -n "${SPACKLE_SHARED_WORKSPACE_ID:-}" ]]; then
  warn "SPACKLE_SHARED_WORKSPACE_ID is set — this looks like a VS Spackle environment secret"
fi

if [[ $issues -gt 0 ]]; then
  echo ""
  echo "This does not look like a dedicated Nula CRM workspace."
  echo "Create or select the Nula environment:"
  echo "  https://cursor.com/onboard?repository=https%3A%2F%2Fgithub.com%2FVandalsSmile%2Fnula-crm"
  echo "See docs/cursor-cloud-workspace.md"
  exit 0
fi

echo "✓ Nula CRM workspace verified (${EXPECTED_REPO})"
