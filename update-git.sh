#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: this script must be run from inside a git repository."
  exit 1
fi

if [ "$#" -gt 0 ]; then
  COMMIT_MESSAGE="$*"
else
  COMMIT_MESSAGE="Auto update $(date +'%Y-%m-%d %H:%M:%S')"
fi

CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
  echo "No changes detected. Nothing to commit."
  exit 0
fi

echo "Detected changes:" 
printf '%s
' "$CHANGES"

git add -A

echo "Committing with message: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "Error: unable to determine current branch."
  exit 1
fi

echo "Pushing to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo "Update complete."
