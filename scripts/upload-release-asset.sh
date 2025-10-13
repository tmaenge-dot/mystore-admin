#!/usr/bin/env bash
# upload-release-asset.sh
# Upload a file to a GitHub release by tag name.
# Usage: GITHUB_TOKEN=... ./scripts/upload-release-asset.sh v0.3.7 path/to/asset.gz

set -euo pipefail
TAG=${1:-}
ASSET=${2:-}
if [ -z "$TAG" ] || [ -z "$ASSET" ]; then
  echo "Usage: GITHUB_TOKEN=... $0 <tag> <asset-path>"
  exit 1
fi
REPO="tmaenge-dot/mystore-admin"
# Get release id for the tag
RELEASE_JSON=$(curl -sS -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$REPO/releases/tags/$TAG")
RELEASE_ID=$(echo "$RELEASE_JSON" | jq -r .id)
if [ "$RELEASE_ID" = "null" ] || [ -z "$RELEASE_ID" ]; then
  echo "Could not find release for tag $TAG"
  echo "$RELEASE_JSON" | sed -n '1,200p'
  exit 1
fi
FILENAME=$(basename "$ASSET")
MIME=$(file --brief --mime-type "$ASSET")
UPLOAD_URL="https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=$FILENAME"
curl -sS -X POST -H "Authorization: token $GITHUB_TOKEN" -H "Content-Type: $MIME" --data-binary "@$ASSET" "$UPLOAD_URL"

echo "Uploaded $ASSET to release $TAG (id: $RELEASE_ID)"
