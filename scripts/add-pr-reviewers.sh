#!/usr/bin/env bash
# add-pr-reviewers.sh
# Add reviewers to a PR by number.
# Usage:
#   GITHUB_TOKEN=... ./scripts/add-pr-reviewers.sh <pr-number> reviewer1,reviewer2
#   GITHUB_TOKEN=... ./scripts/add-pr-reviewers.sh <pr-number> reviewer1 reviewer2 reviewer3
#
# Examples:
#   GITHUB_TOKEN=... ./scripts/add-pr-reviewers.sh 12 alice,bob
#   GITHUB_TOKEN=... ./scripts/add-pr-reviewers.sh 12 alice bob
#
# Options:
#   -n, --dry-run   Print the request and do not call the GitHub API
set -euo pipefail

DRY_RUN=0
while [ $# -gt 0 ] && [[ "$1" =~ ^- ]]; do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      sed -n '1,120p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

PR_NUMBER=${1:-}
shift || true
if [ -z "$PR_NUMBER" ]; then
  echo "Usage: GITHUB_TOKEN=... $0 <pr-number> reviewer1,reviewer2"
  exit 1
fi

# Collect remaining args as reviewers. Accept either a single comma list or multiple args.
if [ $# -eq 0 ]; then
  echo "Error: no reviewers provided"
  echo "Usage: GITHUB_TOKEN=... $0 <pr-number> reviewer1,reviewer2"
  exit 1
fi

if [ $# -eq 1 ]; then
  # Could be 'alice,bob' or single reviewer
  REVIEWERS_RAW="$1"
else
  # Multiple args -> join with commas
  REVIEWERS_RAW=$(printf ",%s" "$@" | cut -c2-)
fi

REPO="tmaenge-dot/mystore-admin"

# Verify GITHUB_TOKEN is set
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Error: GITHUB_TOKEN is not set. Export it like:"
  echo "  export GITHUB_TOKEN=ghp_xxx"
  exit 1
fi

# Ensure jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed. Install it and try again."
  exit 1
fi

REVIEWERS="$REVIEWERS_RAW"
# Convert comma list to JSON array
REVIEWERS_JSON=$(jq -nc --arg r "$REVIEWERS" '[$r|split(",")]')

# Call GitHub API and capture HTTP status + body
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run: would POST to https://api.github.com/repos/$REPO/pulls/$PR_NUMBER/requested_reviewers"
  echo "Request body: {\"reviewers\":$REVIEWERS_JSON }"
  exit 0
fi

tmpfile=$(mktemp)
http_status=$(curl -sS -o "$tmpfile" -w "%{http_code}" -X POST "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER/requested_reviewers" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"reviewers\":$REVIEWERS_JSON}")

if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
  echo "Requested reviewers ($REVIEWERS) on PR #$PR_NUMBER"
  rm -f "$tmpfile"
  exit 0
else
  echo "Failed to request reviewers: HTTP $http_status"
  echo "Response from GitHub:"
  cat "$tmpfile"
  rm -f "$tmpfile"
  exit 1
fi
