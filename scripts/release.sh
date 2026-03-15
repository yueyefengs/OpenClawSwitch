#!/usr/bin/env bash
# release.sh — push to main and create/push an incremented tag
# Usage:
#   ./scripts/release.sh          # auto-increment patch:  v0.4.0 → v0.4.1
#   ./scripts/release.sh minor    # increment minor:       v0.4.0 → v0.5.0
#   ./scripts/release.sh major    # increment major:       v0.4.0 → v1.0.0
#   ./scripts/release.sh v1.2.3   # use exact version

set -euo pipefail

BUMP="${1:-patch}"

# ── 1. Ensure working tree is clean ──────────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

# ── 2. Push current branch to main ───────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📤 Pushing branch '$BRANCH' → origin main..."
git push origin "$BRANCH:main"

# ── 3. Determine next tag ─────────────────────────────────────────────────────
LATEST=$(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)

if [[ -z "$LATEST" ]]; then
  LATEST="v0.0.0"
fi

echo "🏷  Latest tag: $LATEST"

# Parse MAJOR.MINOR.PATCH
IFS='.' read -r MAJOR MINOR PATCH <<< "${LATEST#v}"

if [[ "$BUMP" == v* ]]; then
  # Exact version provided
  NEXT="$BUMP"
else
  case "$BUMP" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
    *)
      echo "❌ Unknown bump type '$BUMP'. Use: patch | minor | major | vX.Y.Z"
      exit 1
      ;;
  esac
  NEXT="v${MAJOR}.${MINOR}.${PATCH}"
fi

echo "🚀 Creating tag $NEXT..."
git tag "$NEXT"
git push origin "$NEXT"

echo "✅ Done. Tag $NEXT pushed — CI build will start automatically."
