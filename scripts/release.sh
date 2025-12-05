#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------------------------
# Configuration
# --------------------------------------------------------
RELEASE_BRANCH="release"

# --------------------------------------------------------
# Helpers
# --------------------------------------------------------
die() {
  echo "ERROR: $1" >&2
  exit 1
}

info() {
  echo "▶ $1"
}

rollback() {
  echo "!!! Rolling back due to failure !!!"
  
  # If we created a tag, delete it
  if git rev-parse "$VERSION" >/dev/null 2>&1; then
    git tag -d "$VERSION" || true
  fi

  # Reset any partial commit(s)
  git reset --hard "$ORIG_HEAD"

  # Abort merge if in-progress
  git merge --abort >/dev/null 2>&1 || true

  die "Rollback complete. Nothing was deployed."
}

trap rollback ERR

# --------------------------------------------------------
# Parse arguments
# --------------------------------------------------------
if [[ $# -lt 1 ]]; then
  die "Usage: $0 <patch|minor|major> [preview]"
fi

ACTION=$1
PREVIEW=${2:-""}
IS_PREVIEW=false

if [[ "$PREVIEW" == "preview" ]]; then
  IS_PREVIEW=true
  info "Running in PREVIEW (dry-run) mode — no changes will be made."
fi

# --------------------------------------------------------
# Start
# --------------------------------------------------------
git_root=$(git rev-parse --show-toplevel)
cd "$git_root"

# Save state for rollback
ORIG_HEAD=$(git rev-parse HEAD)

# --------------------------------------------------------
# Ensure clean working tree
# --------------------------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  die "Working tree is not clean. Commit or stash first."
fi

# --------------------------------------------------------
# Check main status
# --------------------------------------------------------
git checkout main >/dev/null 2>&1 || die "Cannot checkout main"

git fetch origin main >/dev/null 2>&1

LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base main origin/main)

if [[ "$LOCAL" != "$REMOTE" ]]; then
  if [[ "$LOCAL" == "$BASE" ]]; then
    die "'main' has unpulled commits. Run: git pull"
  elif [[ "$REMOTE" == "$BASE" ]]; then
    die "'main' has unpushed commits. Run: git push"
  else
    die "'main' has diverged from origin. Resolve manually."
  fi
fi

info "'main' is fully pushed and clean."

# --------------------------------------------------------
# Calculate version (preview safe)
# --------------------------------------------------------
cd web

CURRENT_VERSION=$(node -p "require('./package.json').version")

if $IS_PREVIEW; then
  NEXT_VERSION=$(npm version "$ACTION" --no-git-tag-version | sed 's/v//')
  info "Current version: $CURRENT_VERSION"
  info "Would bump to:   $NEXT_VERSION"
  cd "$git_root"
else
  npm version "$ACTION" >/dev/null 2>&1
  NEXT_VERSION=$(node -p "require('./package.json').version")
fi

VERSION="$NEXT_VERSION"

if $IS_PREVIEW; then
  echo
  echo "=== PREVIEW SUMMARY ==="
  echo "Version bump:          $CURRENT_VERSION → $VERSION"
  echo "Merge main → release:  yes"
  echo "Tag to create:         $VERSION"
  echo "Changelog file:        web/public/changelog.json"
  echo
  echo "No changes made (dry-run)."
  exit 0
fi

# --------------------------------------------------------
# Commit version changes
# --------------------------------------------------------
git add package*.json

CHANGELOG=public/changelog.json

npx auto-changelog \
  -p \
  --latest-version "$VERSION" \
  --starting-version 3.0.0 \
  --commit-limit false \
  --hide-empty-releases \
  --ignore-commit-pattern "update to version" \
  -o "$CHANGELOG" -t json

git add "$CHANGELOG"

git commit -m "${ACTION^} update to version $VERSION"

cd "$git_root"

# --------------------------------------------------------
# Ensure release branch exists
# --------------------------------------------------------
if ! git show-ref --verify --quiet refs/heads/$RELEASE_BRANCH; then
  info "Creating $RELEASE_BRANCH branch."
  git checkout -b "$RELEASE_BRANCH" main
  git push -u origin "$RELEASE_BRANCH"
else
  git checkout "$RELEASE_BRANCH"
  git pull origin "$RELEASE_BRANCH" --ff-only
fi

# --------------------------------------------------------
# Merge main → release
# --------------------------------------------------------
git merge main --no-ff -m "Merge main into release for version $VERSION"

# --------------------------------------------------------
# Tag the release
# --------------------------------------------------------
git tag "$VERSION"

# --------------------------------------------------------
# Push final changes
# --------------------------------------------------------
git push origin "$RELEASE_BRANCH"
git push origin "$VERSION"

info "Release $VERSION completed successfully."
exit 0
