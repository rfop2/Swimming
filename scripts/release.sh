#!/usr/bin/env bash
set -euo pipefail

MAIN_BRANCH="main"
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
ACTION=""
MAX_RELEASES="24"
MAX_DAYS="60"

while [[ $# -gt 0 ]]; do
  case $1 in
    patch|minor|major) ACTION="$1" ;;
    --releases) MAX_RELEASES="$2"; shift ;;
    --days)     MAX_DAYS="$2";     shift ;;
    *) die "Usage: $0 <patch|minor|major> [--releases N] [--days N]" ;;
  esac
  shift
done

if [[ -z "$ACTION" ]]; then
  die "Usage: $0 <patch|minor|major> [--releases N] [--days N]"
fi

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
git checkout $MAIN_BRANCH >/dev/null 2>&1
git fetch origin $MAIN_BRANCH >/dev/null 2>&1

LOCAL=$(git rev-parse $MAIN_BRANCH)
REMOTE=$(git rev-parse origin/$MAIN_BRANCH)
BASE=$(git merge-base $MAIN_BRANCH origin/$MAIN_BRANCH)

if [[ "$LOCAL" != "$REMOTE" ]]; then
  if [[ "$LOCAL" == "$BASE" ]]; then
    die "'$MAIN_BRANCH' has unpulled commits. Run: git pull"
  elif [[ "$REMOTE" == "$BASE" ]]; then
    die "'$MAIN_BRANCH' has unpushed commits. Run: git push"
  else
    die "'$MAIN_BRANCH' has diverged from origin. Resolve manually."
  fi
fi

info "'$MAIN_BRANCH' is clean and fully pushed."

# --------------------------------------------------------
# Version bump + changelog
# --------------------------------------------------------
cd web

npm version "$ACTION" >/dev/null 2>&1
VERSION=$(node -p "require('./package.json').version")

git add package*.json

CHANGELOG=public/changelog.json

# Compute the effective starting version from the floor plus any --releases / --days limits.
# The most recent (most restrictive) candidate wins.
FLOOR_VERSION="10.0.0"
CANDIDATES=("$FLOOR_VERSION")

if [[ -n "$MAX_RELEASES" ]]; then
  # Nth most-recent tag (sorted newest-first) becomes the starting point
  RELEASE_START=$(git -C "$git_root" tag --sort=-version:refname \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' \
    | sed -n "${MAX_RELEASES}p")
  [[ -n "$RELEASE_START" ]] && CANDIDATES+=("$RELEASE_START")
fi

if [[ -n "$MAX_DAYS" ]]; then
  SINCE_EPOCH=$(date -d "${MAX_DAYS} days ago" +%s)
  # Walk tags oldest-first; stop at the first one inside the window
  DAYS_START=""
  while IFS= read -r tag; do
    tag_epoch=$(git -C "$git_root" log -1 --format="%ct" "$tag" 2>/dev/null || echo 0)
    if [[ "$tag_epoch" -ge "$SINCE_EPOCH" ]]; then
      DAYS_START="$tag"
      break
    fi
  done < <(git -C "$git_root" tag --sort=version:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$')
  [[ -n "$DAYS_START" ]] && CANDIDATES+=("$DAYS_START")
fi

STARTING_VERSION=$(printf '%s\n' "${CANDIDATES[@]}" | sort -V | tail -n1)
info "Changelog starting version: $STARTING_VERSION"

npx auto-changelog \
  -p \
  --latest-version "$VERSION" \
  --starting-version "$STARTING_VERSION" \
  --commit-limit false \
  --hide-empty-releases \
  --ignore-commit-pattern "update to version|Merge main into release" \
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
  git checkout -b "$RELEASE_BRANCH" $MAIN_BRANCH
  git push -u origin "$RELEASE_BRANCH"
else
  git checkout "$RELEASE_BRANCH"
  git pull origin "$RELEASE_BRANCH" --ff-only
fi

# --------------------------------------------------------
# Merge main → release
# --------------------------------------------------------
git merge $MAIN_BRANCH --no-ff -m "Merge $MAIN_BRANCH into release for version $VERSION"

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

# --------------------------------------------------------
# Checkout main again to ensure commits don't go onto release
# --------------------------------------------------------
git checkout $MAIN_BRANCH >/dev/null 2>&1

exit 0
