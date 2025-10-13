#!/usr/bin/env bash
# create-release.sh
# Create a GitHub release draft for a given tag using RELEASE_NOTES.md as the body.
# Usage:
#   GITHUB_TOKEN=ghp_... ./scripts/create-release.sh v0.3.7

set -euo pipefail
TAG=${1:-}
if [ -z "$TAG" ]; then
  echo "Usage: GITHUB_TOKEN=... $0 <tag>"
  exit 1
fi
REPO="tmaenge-dot/mystore-admin"
BODY_FILE="RELEASE_NOTES.md"
if [ ! -f "$BODY_FILE" ]; then
  echo "Missing $BODY_FILE in repo root"
  exit 1
fi
BODY=$(jq -Rs . < "$BODY_FILE")
API_URL="https://api.github.com/repos/$REPO/releases"
curl -sS -X POST "$API_URL" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d @- <<EOF
{"tag_name":"$TAG","name":"$TAG - Perceptual branding + admin contrast checks","body":$BODY,"draft":true}
EOF

echo "Created draft release for $TAG (if the token has permission)."
