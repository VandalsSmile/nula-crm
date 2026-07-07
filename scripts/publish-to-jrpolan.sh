#!/usr/bin/env bash
set -euo pipefail

# DEPRECATED — Nula CRM is now developed directly in jrpolan/nula-crm.
# This one-time script mirrored an early scaffold from vs-spackle.

# Mirrors the scaffold branch from VandalsSmile/vs-spackle into jrpolan/nula-crm.
# Run this locally with credentials that can push to jrpolan/nula-crm.

SOURCE_REPO="${SOURCE_REPO:-https://github.com/VandalsSmile/vs-spackle.git}"
SOURCE_BRANCH="${SOURCE_BRANCH:-cursor/nula-crm-scaffold-054a}"
TARGET_REPO="${TARGET_REPO:-https://github.com/jrpolan/nula-crm.git}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"

WORKDIR="${WORKDIR:-/tmp/nula-crm-publish}"
rm -rf "$WORKDIR"

git clone --branch "$SOURCE_BRANCH" --single-branch "$SOURCE_REPO" "$WORKDIR"
cd "$WORKDIR"

git remote rename origin source
git remote add target "$TARGET_REPO"
git push -u target "HEAD:$TARGET_BRANCH"

echo "Published $SOURCE_BRANCH from vs-spackle to $TARGET_REPO ($TARGET_BRANCH)"
