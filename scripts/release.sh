#!/usr/bin/env bash
set -euo pipefail

RELEASE_BRANCH="release"

# --- predeclare variables so rollback never fails ---
VERSION=""
ORIG_HEAD=""

die() {
  echo "ERROR: $1" >&2
  exit 1
}

info() {
  echo "▶ $1"
}

rollback() {
  echo "!!! Rolling back due to failure !!!"

  # delete tag if created
  if [[ -n "$VERSION" ]] && git rev-parse "$VERSION" >/dev/null 2>&1; then
    git tag -d "$VERSION" >/dev/null 2>&1 || true
  fi

  # reset to original commit
  if [[ -n "$ORIG_HEAD" ]]; then
    git reset --hard "$ORIG_HEAD" >/dev/null 2>&1 || true
  fi

  # merge abort if necessary
  git merge --abort >/dev/null 2>&1 || true

  die "Rollback complete. Nothing was released."
}

trap rollback ERR

# --------------------------------------------------------
# Parse arguments
# --------------------------------------------------------
if [[ $# -lt 1 ]]; then
  die "Usage: $0 <patch|minor|major>"
fi

ACTION=$1


# --------------------------------------------------------
# Repository root + save state
# --------------------------------------------------------
git_root=$(git rev-parse --show-toplevel)
cd "$git_root"

ORIG_HEAD=$(git rev-parse HEAD)


# --------------------------------------------------------
# Ensure clean working tree
# --------------------------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  die "Working tree not clean. Commit or stash first."
fi


# --------------------------------------------------------
# Ensure main is synced
# --------------------------------------------------------
git checkout main >/dev/null 2>&1
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

info "'main' is clean and fully pushed."


# --------------------------------------------------------
# Version bump + changelog
# --------------------------------------------------------
cd web

npm version "$ACTION" >/dev/null 2>&1
VERSION=$(node -p "require('./package.json').version")

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

git push

cd "$git_root"


# --------------------------------------------------------
# Ensure release branch exists
# --------------------------------------------------------
if ! git show-ref --verify --quiet "refs/heads/$RELEASE_BRANCH"; then
  info "Creating $RELEASE_BRANCH branch"
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
# Tag release
# --------------------------------------------------------
git tag "$VERSION"


# --------------------------------------------------------
# Push results
# --------------------------------------------------------
git push origin "$RELEASE_BRANCH"
git push origin "$VERSION"

info "Release $VERSION completed successfully."
exit 0
