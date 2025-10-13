# Publish release v0.3.7
GITHUB_TOKEN=ghp_xxx ./scripts/create-release.sh v0.3.7
# Upload asset
GITHUB_TOKEN=ghp_xxx ./scripts/upload-release-asset.sh v0.3.7 perceptual-branding-release-20251013T155833.tar.gz
