#!/usr/bin/env bash
set -eu
# purge-history.sh - safe wrapper to backup, preview, and (optionally) push a git history rewrite
# Usage:
#   ./scripts/purge-history.sh preview      # create a mirror and run filter preview (no push)
#   PURGE_RUN=1 ./scripts/purge-history.sh run     # run filter and FORCE-PUSH cleaned refs to origin

REPO_ROOT="$(pwd)"
MIRROR_DIR="${REPO_ROOT}/repo-filter.git"
FILTER_SCRIPT="/tmp/git-filter-repo.py"
REPORT_DIR="/tmp/mystore-filter-report"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <preview|run>"
  exit 2
fi

MODE="$1"

echo "[purge-history] mode=${MODE} repo=${REPO_ROOT}"

if [ "${MODE}" != "preview" ] && [ "${MODE}" != "run" ]; then
  echo "Unknown mode: ${MODE}" >&2
  exit 2
fi

if [ "${MODE}" = "run" ] && [ -z "${PURGE_RUN:-}" ]; then
  echo "To perform a destructive run you must set PURGE_RUN=1 in the environment. Aborting." >&2
  echo "Example: PURGE_RUN=1 $0 run" >&2
  exit 2
fi

echo "Creating mirror clone: ${MIRROR_DIR}"
rm -rf "${MIRROR_DIR}"
git clone --mirror "$(git remote get-url origin)" "${MIRROR_DIR}"

echo "Downloading git-filter-repo helper if missing"
if [ ! -x "${FILTER_SCRIPT}" ]; then
  curl -sSLo "${FILTER_SCRIPT}" https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo
  chmod +x "${FILTER_SCRIPT}"
fi

echo "Running filter in mirror (NON-DESTRUCTIVE for 'preview' mode)"
cd "${MIRROR_DIR}"

# Customize these paths to remove from history. Update as needed.
TARGET_PATHS=(
  "data_store"
  "logs"
  "server.output.log"
  "server.pid"
)

FILTER_ARGS=()
for p in "${TARGET_PATHS[@]}"; do
  FILTER_ARGS+=(--invert-paths --path "${p}")
done

echo "Filter args: ${FILTER_ARGS[*]}"
rm -rf "${REPORT_DIR}" || true
"${FILTER_SCRIPT}" "${FILTER_ARGS[@]}" --force --report-dir "${REPORT_DIR}"

echo "Filter run complete. Inspect report at: ${REPORT_DIR}"

echo "Verifying removed paths (should return no matches):"
git rev-list --all --objects | grep -E "$(printf "%s|" "${TARGET_PATHS[@]}" | sed 's/|$//')" || true

if [ "${MODE}" = "preview" ]; then
  echo "Preview complete. Mirror created at: ${MIRROR_DIR}" 
  echo "If you want to finalize the purge, set PURGE_RUN=1 and run: PURGE_RUN=1 $0 run"
  exit 0
fi

echo "MODE=run and PURGE_RUN=1 confirmed. About to push rewritten refs to origin. This is destructive and will FORCE-UPDATE remote refs."
read -p "Type YES to continue: " ans
if [ "$ans" != "YES" ]; then
  echo "Aborted by user."; exit 1
fi

echo "Pushing cleaned refs to origin (force). This will overwrite remote history."
# Push all refs and tags
git remote add origin-clean "$(git -C "${REPO_ROOT}" remote get-url origin)" || true
git push --force --mirror origin-clean

echo "Push complete. Remember to notify collaborators to re-clone or run 'git fetch --all && git reset --hard origin/<branch>' as appropriate."
